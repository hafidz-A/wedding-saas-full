// src/app/admin/invitations/__tests__/period.test.ts
import { describe, it, expect } from 'vitest'
import { compExpiry } from '../period'

describe('compExpiry', () => {
  const now = 1_700_000_000_000
  const planIso = new Date(now + 365 * 86_400_000).toISOString()
  it('lifetime -> null', () => {
    expect(compExpiry(planIso, { kind: 'lifetime' }, now)).toBeNull()
  })
  it('days -> now + N days ISO', () => {
    expect(compExpiry(planIso, { kind: 'days', days: 30 }, now)).toBe(new Date(now + 30 * 86_400_000).toISOString())
  })
  it('plan -> passes the plan expiry through (null = lifetime plan)', () => {
    expect(compExpiry(planIso, { kind: 'plan' }, now)).toBe(planIso)
    expect(compExpiry(null, { kind: 'plan' }, now)).toBeNull()
  })
})
