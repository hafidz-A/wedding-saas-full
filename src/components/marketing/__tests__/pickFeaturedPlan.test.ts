import { describe, it, expect } from 'vitest'
import { pickFeaturedPlanId } from '../pickFeaturedPlan'
import type { PlanDisplay } from '@/lib/payments/plan-display'

const mk = (id: string, amountIDR: number): PlanDisplay => ({
  id, name: id, price: `Rp ${amountIDR}`, amountIDR,
  compareAtPrice: null, features: [], baseQuota: 200,
})

describe('pickFeaturedPlanId', () => {
  it('returns null for an empty list', () => {
    expect(pickFeaturedPlanId([])).toBeNull()
  })
  it('picks the highest-priced plan', () => {
    expect(pickFeaturedPlanId([mk('basic', 149000), mk('premium', 299000)])).toBe('premium')
  })
  it('is order-independent (highest wins even if listed first)', () => {
    expect(pickFeaturedPlanId([mk('premium', 299000), mk('basic', 149000)])).toBe('premium')
  })
  it('on a tie, picks the later plan in the list', () => {
    expect(pickFeaturedPlanId([mk('a', 100000), mk('b', 100000)])).toBe('b')
  })
})
