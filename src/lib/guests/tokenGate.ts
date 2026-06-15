import { hashToken } from './token'

/**
 * Atomically validate + consume a guest's single-use token for an invitation.
 *
 * Returns true ONLY if a matching, not-yet-used token row was flipped to used.
 * The `where token_used_at is null` clause makes this race-safe: two concurrent
 * submits with the same code → exactly one update matches a row, the other
 * matches zero. Caller maps `false` to a single generic error (no wrong-vs-used
 * oracle). Truly single-use: any successful RSVP OR ucapan consumes the code.
 *
 * `admin` is a service-role Supabase client (RLS bypass is intentional here).
 */
export async function consumeGuestToken(
  admin: any,
  invitationId: string,
  token: string,
): Promise<boolean> {
  if (!/^\d{6}$/.test(token || '')) return false
  const tokenHash = hashToken(invitationId, token)
  const { data, error } = await (admin.from('guests') as any)
    .update({ token_used_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .is('token_used_at', null)
    .select('id')
    .maybeSingle()
  // Throws the PostgrestError on DB failure — the caller MUST catch it and
  // return a generic response (never surface the raw error to the client).
  if (error) throw error
  return !!data
}

export type RsvpTokenCheck =
  | { result: 'ok'; guestId: string }
  | { result: 'invalid' }
  | { result: 'already_rsvped' }

/**
 * RSVP-specific single-use consume. Succeeds only if the code is valid, UNUSED,
 * AND the guest has not already completed an RSVP — so a fresh (regenerated)
 * code can never produce a duplicate RSVP. On a 0-row consume, a diagnostic read
 * distinguishes "already RSVP'd" (friendly 409) from "invalid/used" (generic
 * 403). The caller stamps rsvp_submitted_at via markGuestRsvpSubmitted ONLY
 * after the RSVP row inserts, so a failed insert stays recoverable by regenerate.
 */
export async function consumeGuestTokenForRsvp(
  admin: any,
  invitationId: string,
  token: string,
): Promise<RsvpTokenCheck> {
  if (!/^\d{6}$/.test(token || '')) return { result: 'invalid' }
  const tokenHash = hashToken(invitationId, token)
  const { data, error } = await (admin.from('guests') as any)
    .update({ token_used_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .is('token_used_at', null)
    .is('rsvp_submitted_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (data) return { result: 'ok', guestId: data.id }
  // 0 rows: read the row to tell "already RSVP'd" from "wrong/used code".
  const { data: diag } = await (admin.from('guests') as any)
    .select('rsvp_submitted_at')
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .maybeSingle()
  if (diag && diag.rsvp_submitted_at) return { result: 'already_rsvped' }
  return { result: 'invalid' }
}

/** Stamp the permanent RSVP-completed marker AFTER a successful RSVP insert. */
export async function markGuestRsvpSubmitted(admin: any, guestId: string): Promise<void> {
  await (admin.from('guests') as any)
    .update({ rsvp_submitted_at: new Date().toISOString() })
    .eq('id', guestId)
    .is('rsvp_submitted_at', null)
}
