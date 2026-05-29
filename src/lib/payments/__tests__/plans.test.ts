import { describe, it, expect } from 'vitest'
import { resolvePlan } from '../plans'

describe('resolvePlan', () => {
  const paidAt = Date.UTC(2026, 0, 1)

  it('resolves basic with +1 year expiry', () => {
    const r = resolvePlan('lovebirds', 'basic')!
    expect(r.amountIDR).toBe(149000)
    expect(r.expiresAt(paidAt)).toBe(new Date(paidAt + 365 * 24 * 60 * 60 * 1000).toISOString())
  })

  it('resolves premium as lifetime (null expiry)', () => {
    const r = resolvePlan('lovebirds', 'premium')!
    expect(r.amountIDR).toBe(299000)
    expect(r.expiresAt(paidAt)).toBeNull()
  })

  it('returns null for unknown template or plan', () => {
    expect(resolvePlan('nope', 'basic')).toBeNull()
    expect(resolvePlan('lovebirds', 'nope')).toBeNull()
  })
})
