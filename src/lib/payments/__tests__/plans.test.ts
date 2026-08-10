import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

// unstable_cache is pulled in at module scope by template-plans.ts; keep it a
// passthrough so the module graph loads outside a Next request scope.
vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { resolvePlanFrom, computeUpgradeAmount, planBaseQuota } from '../plans'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getTemplatePlans, type TemplatePlanRow } from '../template-plans'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
beforeEach(() => { vi.clearAllMocks() })

const rows: TemplatePlanRow[] = [
  { template_id: 'lovebirds', plan_code: 'basic',   display_name: 'Basic',   price_idr: 149000, duration_days: 365,  features: [], sort_order: 1, base_guest_quota: 200, compare_at_price_idr: null },
  { template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium', price_idr: 299000, duration_days: null, features: [], sort_order: 2, base_guest_quota: 300, compare_at_price_idr: null },
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
  it('falls back to DEFAULT_BASE_QUOTA then the basic default for unknown plans', () => {
    expect(planBaseQuota([], 'premium')).toBe(500)
    expect(planBaseQuota([], 'free')).toBe(400)
  })
})

describe('getTemplatePlans — compare_at_price_idr', () => {
  it('maps a numeric compare_at_price_idr onto the row', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          template_plans: {
            select: {
              data: [
                { template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium', price_idr: 299000, duration_days: null, features: [], sort_order: 2, base_guest_quota: 300, compare_at_price_idr: 399000 },
              ],
            },
          },
        },
      }) as any,
    )
    const plans = await getTemplatePlans('lovebirds')
    expect(plans[0].compare_at_price_idr).toBe(399000)
  })

  it('maps a null/absent compare_at_price_idr to null', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          template_plans: {
            select: {
              data: [
                { template_id: 'lovebirds', plan_code: 'basic', display_name: 'Basic', price_idr: 149000, duration_days: 365, features: [], sort_order: 1, base_guest_quota: 200, compare_at_price_idr: null },
                { template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium', price_idr: 299000, duration_days: null, features: [], sort_order: 2, base_guest_quota: 300 },
              ],
            },
          },
        },
      }) as any,
    )
    const plans = await getTemplatePlans('lovebirds')
    expect(plans[0].compare_at_price_idr).toBeNull()
    expect(plans[1].compare_at_price_idr).toBeNull()
  })
})
