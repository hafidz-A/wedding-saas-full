// Server-only: is an invitation FULLY refunded? True iff the refunds ledger has
// a succeeded row for its INITIAL purchase (refunded renewals are recorded as
// 'initial' by the webhook; upgrade/addon refunds do NOT take the invitation down).
import 'server-only'

/** confirmed_at of the succeeded initial-purchase refund, or null. */
export async function fetchRefundedAt(db: any, invitationId: string): Promise<string | null> {
  const { data } = await db.from('refunds')
    .select('confirmed_at')
    .eq('source_type', 'initial').eq('source_id', invitationId).eq('status', 'succeeded').limit(1)
  return data?.[0]?.confirmed_at ?? null
}

/** Batched variant for lists (profile, admin): invitation id → confirmed_at (''
 *  when the row predates confirmed_at backfill). Missing key = not refunded. */
export async function fetchRefundedMap(db: any, invitationIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!invitationIds.length) return map
  const { data } = await db.from('refunds')
    .select('source_id, confirmed_at')
    .eq('source_type', 'initial').eq('status', 'succeeded').in('source_id', invitationIds)
  for (const r of (data ?? []) as { source_id: string | null; confirmed_at: string | null }[]) {
    if (r.source_id) map.set(r.source_id, r.confirmed_at ?? '')
  }
  return map
}
