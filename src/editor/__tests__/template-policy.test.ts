import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder } from '../templatePolicy'

const ids = ['intro','neptune','uranus','saturn','jupiter','mars','earth','venus','mercury','sun']

describe('getTemplatePolicy', () => {
  it('returns null for templates without a policy (e.g. lovebirds)', () => {
    expect(getTemplatePolicy('lovebirds')).toBeNull()
  })
  it('locks intro, saturn, sun for solary', () => {
    const p = getTemplatePolicy('solary')!
    expect(p.fixedSections).toBe(true)
    expect(p.locks.saturn).toEqual({ lockType: true, lockPosition: true, lockDisable: true })
    expect(p.locks.intro.lockType).toBe(true)
    expect(p.locks.sun.lockType).toBe(true)
    expect(p.swappablePool).not.toContain('saturnRing')
    expect(p.swappablePool).toContain('faqPlanet')
  })
})

describe('computeSafeOrder', () => {
  const p = getTemplatePolicy('solary')!
  it('reorders two movable slots', () => {
    const next = computeSafeOrder(ids, 'venus', 'jupiter', p)
    expect(next).toEqual(['intro','neptune','uranus','saturn','venus','jupiter','mars','earth','mercury','sun'])
  })
  it('refuses to move a locked-position slot (saturn)', () => {
    expect(computeSafeOrder(ids, 'saturn', 'neptune', p)).toBeNull()
  })
  it('keeps pinned anchors fixed (intro first, sun last, saturn at index 3)', () => {
    const next = computeSafeOrder(ids, 'mercury', 'sun', p)
    if (next) {
      expect(next[0]).toBe('intro')
      expect(next[next.length - 1]).toBe('sun')
      expect(next[3]).toBe('saturn')
    }
  })
})
