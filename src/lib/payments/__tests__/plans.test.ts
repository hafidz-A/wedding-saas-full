import { describe, it, expect } from 'vitest'
import { resolvePlanFrom, computeUpgradeAmount, planBaseQuota } from '../plans'
import type { TemplatePlanRow } from '../template-plans'

const rows: TemplatePlanRow[] = [
  { template_id: 'lovebirds', plan_code: 'basic',   display_name: 'Basic',   price_idr: 149000, duration_days: 365,  features: [], sort_order: 1, base_guest_quota: 200 },
  { template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium', price_idr: 299000, duration_days: null, features: [], sort_order: 2, base_guest_quota: 300 },
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

describe('computeUpgradeAmount', () => {
  it('charges the price difference for basic -> premium', () => {
    expect(computeUpgradeAmount(rows, 'basic', 'premium')).toBe(299000 - 149000)
  })

  it('charges the full target price when fromPlan is unknown (e.g. legacy free)', () => {
    expect(computeUpgradeAmount(rows, 'free', 'premium')).toBe(299000)
  })

  it('returns 0 when already at (or above) the target', () => {
    expect(computeUpgradeAmount(rows, 'premium', 'premium')).toBe(0)
  })

  it('returns null when the target plan is not sellable', () => {
    expect(computeUpgradeAmount(rows, 'basic', 'nope')).toBeNull()
  })
})

describe('planBaseQuota', () => {
  it('reads base from the matching plan row', () => {
    expect(planBaseQuota(rows, 'basic')).toBe(200)
    expect(planBaseQuota(rows, 'premium')).toBe(300)
  })
  it('falls back to DEFAULT_BASE_QUOTA then 200 for unknown plans', () => {
    expect(planBaseQuota([], 'premium')).toBe(300)
    expect(planBaseQuota([], 'free')).toBe(200)
  })
})
