// src/lib/payments/refund-policy.ts
// Pure refund eligibility verdict from a usage snapshot. A FLAG for the operator,
// never an auto-decision — the operator still approves/rejects (policy §5). It
// just makes "use it then ask for money back" (§3) obvious.

export interface UsageSnapshot {
  is_published: boolean
  guest_count: number
  rsvp_count: number
  attendance_count: number
  config_edited: boolean
  days_since_paid: number
  /** STICKY: true once the paid invitation was ever used (guest/RSVP/check-in).
   *  Set by a DB trigger, never cleared — deleting guests can't reset it. */
  ever_used: boolean
}

export interface RefundVerdict {
  eligible: boolean
  code: string
  /** Plain-language badge for the operator panel. */
  label: string
}

/** Grace window (days) an invitation can be live before "sudah dipakai" kicks in. */
export const REFUND_LIVE_GRACE_DAYS = 3

export function refundVerdict(s: UsageSnapshot): RefundVerdict {
  // STICKY first: once used, stays "used" even if the couple deletes the guests —
  // eligibility is one-way, so usage can't be undone to become eligible again (§3).
  if (s.ever_used) return { eligible: false, code: 'used-ever', label: 'Tidak layak — undangan sudah pernah dipakai (tamu/RSVP/check-in) (§3)' }
  if (s.attendance_count > 0) return { eligible: false, code: 'used-checkin', label: 'Tidak layak — sudah ada tamu check-in (§3)' }
  if (s.guest_count > 0 || s.rsvp_count > 0) return { eligible: false, code: 'used-guests', label: 'Tidak layak — sudah dipakai: ada tamu/RSVP (§3)' }
  if (s.is_published && s.days_since_paid > REFUND_LIVE_GRACE_DAYS) return { eligible: false, code: 'used-live', label: `Tidak layak — sudah tayang > ${REFUND_LIVE_GRACE_DAYS} hari (§3)` }
  return { eligible: true, code: 'ok', label: 'Masih layak' }
}
