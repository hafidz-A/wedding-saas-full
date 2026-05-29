export type ActiveStatus = 'draft' | 'lifetime' | 'active' | 'expired'

/**
 * Classify an invitation's active period for display on the profile + dashboard.
 * - not paid → 'draft'
 * - paid, no expiry → 'lifetime'
 * - paid, expiry in the future → 'active'
 * - paid, expiry in the past → 'expired'
 */
export function activePeriodStatus(
  inv: { is_paid?: boolean; expires_at?: string | null },
  nowMs: number,
): { status: ActiveStatus; expiresAt: string | null } {
  if (!inv.is_paid) return { status: 'draft', expiresAt: null }
  if (!inv.expires_at) return { status: 'lifetime', expiresAt: null }
  const exp = Date.parse(inv.expires_at)
  return { status: exp < nowMs ? 'expired' : 'active', expiresAt: inv.expires_at }
}
