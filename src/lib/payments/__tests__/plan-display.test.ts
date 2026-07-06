import { describe, it, expect } from 'vitest'
import { toPlanDisplay } from '../plan-display'

const row = {
  template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium',
  price_idr: 299000, duration_days: null, features: ['Galeri unlimited', 'Musik'],
  sort_order: 2, base_guest_quota: 300, compare_at_price_idr: null,
} as any

describe('toPlanDisplay', () => {
  it('maps a row to the display shape (no discount)', () => {
    expect(toPlanDisplay(row)).toEqual({
      id: 'premium', name: 'Premium', price: 'Rp 299.000', amountIDR: 299000,
      compareAtPrice: null, features: ['Galeri unlimited', 'Musik'], baseQuota: 300,
    })
  })
  it('sets compareAtPrice only when compare_at > price', () => {
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 399000 }).compareAtPrice).toBe('Rp 399.000')
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 299000 }).compareAtPrice).toBeNull()
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 100000 }).compareAtPrice).toBeNull()
  })
})
