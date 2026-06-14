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
  if (error) throw error
  return !!data
}
