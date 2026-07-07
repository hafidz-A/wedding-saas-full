// src/lib/payments/refund-usage.ts
// Server-only: build a live usage snapshot for a refund request. Shared by
// requestRefund (snapshot at request time, for the record) and the admin panel
// (recomputed LIVE every view, so the eligibility verdict is never stale — a
// couple can't request-then-use-it-then-still-look-eligible to the operator).
import 'server-only'
import type { UsageSnapshot } from './refund-policy'

export async function buildUsageSnapshot(
  db: any,
  invitationId: string,
  inv: { is_published?: boolean; paid_at?: string | null; updated_at?: string | null },
  nowMs: number = Date.now(),
): Promise<UsageSnapshot> {
  const [g, r, a] = await Promise.all([
    (db.from('guests') as any).select('id', { count: 'exact', head: true }).eq('invitation_id', invitationId),
    (db.from('rsvps') as any).select('id', { count: 'exact', head: true }).eq('invitation_id', invitationId),
    (db.from('attendances') as any).select('id', { count: 'exact', head: true }).eq('invitation_id', invitationId),
  ])
  const paidMs = inv.paid_at ? Date.parse(inv.paid_at) : nowMs
  return {
    is_published: !!inv.is_published,
    guest_count: g.count ?? 0,
    rsvp_count: r.count ?? 0,
    attendance_count: a.count ?? 0,
    // Coarse hint only: updated_at also bumps on admin actions, so this is NOT
    // reliable enough to drive the eligibility verdict (refundVerdict ignores it).
    // Kept for the record; the verdict uses the accurate guest/RSVP/check-in signals.
    config_edited: !!inv.updated_at && Date.parse(inv.updated_at) > paidMs + 60_000,
    days_since_paid: Math.max(0, Math.floor((nowMs - paidMs) / 86_400_000)),
  }
}
