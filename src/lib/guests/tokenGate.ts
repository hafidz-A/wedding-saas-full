import { hashToken } from './token'

/**
 * A guest's 6-digit code allows ONE RSVP and ONE ucapan (guestbook note),
 * tracked by two independent single-use markers on the guests row:
 *   • rsvp_submitted_at — the RSVP (permanent: a regenerated code can't RSVP again)
 *   • token_used_at     — the ucapan (cleared when the owner regenerates the code)
 *
 * Each claim is one atomic UPDATE … WHERE <marker> IS NULL, so two concurrent
 * submits with the same code → exactly one matches a row. If the caller's
 * insert then fails, it releases the claim so the guest can simply retry with
 * the same code. `admin` is a service-role client (RLS bypass is intentional).
 */

/**
 * Claim the code's ucapan. Returns the guest id, or null when the code is
 * malformed, wrong, or its ucapan was already sent (one generic answer — no
 * wrong-vs-used oracle). Throws on a DB error; the caller MUST catch it and
 * return a generic response.
 */
export async function consumeGuestToken(
  admin: any,
  invitationId: string,
  token: string,
): Promise<string | null> {
  if (!/^\d{6}$/.test(token || '')) return null
  const tokenHash = hashToken(invitationId, token)
  const { data, error } = await (admin.from('guests') as any)
    .update({ token_used_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .is('token_used_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw error
  return data ? (data.id as string) : null
}

/** Undo a ucapan claim whose note failed to save, so the same code still works. */
export async function releaseGuestToken(admin: any, guestId: string): Promise<void> {
  await (admin.from('guests') as any).update({ token_used_at: null }).eq('id', guestId)
}

export type RsvpTokenCheck =
  | { result: 'ok'; guestId: string }
  | { result: 'invalid' }
  | { result: 'already_rsvped' }

/**
 * Claim the code's RSVP by stamping rsvp_submitted_at. Independent of the
 * ucapan: a guest who sent a wish first can still RSVP. On a 0-row claim, a
 * diagnostic read distinguishes "already RSVP'd" (friendly 409) from
 * "invalid code" (generic 403). Throws on a DB error.
 */
export async function consumeGuestTokenForRsvp(
  admin: any,
  invitationId: string,
  token: string,
): Promise<RsvpTokenCheck> {
  if (!/^\d{6}$/.test(token || '')) return { result: 'invalid' }
  const tokenHash = hashToken(invitationId, token)
  const { data, error } = await (admin.from('guests') as any)
    .update({ rsvp_submitted_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .is('rsvp_submitted_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (data) return { result: 'ok', guestId: data.id }
  // 0 rows: read the row to tell "already RSVP'd" from "wrong code".
  const { data: diag } = await (admin.from('guests') as any)
    .select('rsvp_submitted_at')
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .maybeSingle()
  if (diag && diag.rsvp_submitted_at) return { result: 'already_rsvped' }
  return { result: 'invalid' }
}

/** Undo an RSVP claim whose RSVP row failed to save, so the same code still works. */
export async function releaseRsvpClaim(admin: any, guestId: string): Promise<void> {
  await (admin.from('guests') as any).update({ rsvp_submitted_at: null }).eq('id', guestId)
}
