// src/app/admin/templates/__tests__/validate.test.ts
import { describe, it, expect } from 'vitest'
import { validatePlanPatch } from '../validate'

const base = {
  display_name: 'Basic', price_idr: 149000, compare_at_price_idr: null,
  base_guest_quota: 200, duration_days: 365, features: ['RSVP'],
}

describe('validatePlanPatch', () => {
  it('accepts a valid patch', () => {
    expect(validatePlanPatch(base)).toEqual({ ok: true })
  })
  it('rejects a non-integer / negative price', () => {
    expect(validatePlanPatch({ ...base, price_idr: 149000.5 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, price_idr: -1 }).ok).toBe(false)
  })
  it('rejects compare-at ≤ price, accepts null or > price', () => {
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 149000 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 100000 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 199000 }).ok).toBe(true)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: null }).ok).toBe(true)
  })
  it('rejects quota not a multiple of 50 or out of [50,5000]', () => {
    expect(validatePlanPatch({ ...base, base_guest_quota: 237 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 0 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 5050 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 250 }).ok).toBe(true)
  })
  it('rejects bad duration / empty features / empty name', () => {
    expect(validatePlanPatch({ ...base, duration_days: 0 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, duration_days: null }).ok).toBe(true)
    expect(validatePlanPatch({ ...base, features: [] }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, features: ['ok', ' '] }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, display_name: '' }).ok).toBe(false)
  })
})
