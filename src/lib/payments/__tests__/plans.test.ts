import { describe, it, expect } from 'vitest'
import { resolvePlanFrom } from '../plans'
import type { TemplatePlanRow } from '../template-plans'

const rows: TemplatePlanRow[] = [
  { template_id: 'lovebirds', plan_code: 'basic',   display_name: 'Basic',   price_idr: 149000, duration_days: 365,  features: [], sort_order: 1 },
  { template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium', price_idr: 299000, duration_days: null, features: [], sort_order: 2 },
]

describe('resolvePlanFrom', () => {
  const paidAt = Date.UTC(2026, 0, 1)

  it('resolves basic with +N day expiry from duration_days', () => {
    const r = resolvePlanFrom(rows, 'basic')!
    expect(r.amountIDR).toBe(149000)
    expect(r.expiresAt(paidAt)).toBe(new Date(paidAt + 365 * 24 * 60 * 60 * 1000).toISOString())
  })

  it('resolves premium as lifetime when duration_days is null', () => {
    const r = resolvePlanFrom(rows, 'premium')!
    expect(r.amountIDR).toBe(299000)
    expect(r.expiresAt(paidAt)).toBeNull()
  })

  it('returns null for an unknown plan code', () => {
    expect(resolvePlanFrom(rows, 'nope')).toBeNull()
  })

  it('returns null for an empty plan list', () => {
    expect(resolvePlanFrom([], 'basic')).toBeNull()
  })
})
