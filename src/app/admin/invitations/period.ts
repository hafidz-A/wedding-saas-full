// src/app/admin/invitations/period.ts
export type CompPeriod = { kind: 'lifetime' } | { kind: 'plan' } | { kind: 'days'; days: number }

/** Pure: compute an expiry ISO from a comp period. `planExpiryIso` is what the
 *  plan's own duration yields (null = lifetime); used when period.kind === 'plan'. */
export function compExpiry(planExpiryIso: string | null, period: CompPeriod, nowMs: number): string | null {
  if (period.kind === 'lifetime') return null
  if (period.kind === 'days') return new Date(nowMs + period.days * 86_400_000).toISOString()
  return planExpiryIso
}
