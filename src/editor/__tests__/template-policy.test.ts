import { describe, it, expect } from 'vitest'
import {
  getTemplatePolicy,
  computeSafeOrder,
  availableAddTypes,
  availableSwapTypes,
} from '../templatePolicy'

const ids = ['intro','neptune','uranus','saturn','jupiter','mars','earth','venus','mercury','sun']

describe('getTemplatePolicy', () => {
  it('returns null for templates without a policy', () => {
    expect(getTemplatePolicy('nonexistent')).toBeNull()
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

describe('lovebirds policy', () => {
  const p = getTemplatePolicy('lovebirds')!
  it('exists, not fixed, max 10, hero/footer anchored + locked', () => {
    expect(p).not.toBeNull()
    expect(p.fixedSections).toBe(false)
    expect(p.maxSections).toBe(10)
    expect(p.anchorFirstType).toBe('hero')
    expect(p.anchorLastType).toBe('footer')
    expect(p.lockedTypes).toEqual(expect.arrayContaining(['hero', 'footer']))
  })
  it('pool excludes hero/footer/registry/guestbook/countdown, includes quote', () => {
    expect(p.swappablePool).toContain('quote')
    for (const t of ['hero', 'footer', 'registry', 'guestbook', 'countdown']) {
      expect(p.swappablePool).not.toContain(t)
    }
  })
})

describe('dedup helpers', () => {
  const reg = { hero: {}, quote: {}, rsvp: {}, weddingGift: {}, faq: {} } as Record<string, unknown>
  const p = getTemplatePolicy('lovebirds')!
  const sections = [{ id: 'a', type: 'hero' }, { id: 'b', type: 'rsvp' }]

  it('availableAddTypes omits used + non-pool + types missing from the registry', () => {
    const out = availableAddTypes(reg, sections, p)
    expect(out).toContain('quote') // in pool, registered, unused
    expect(out).not.toContain('rsvp') // used
    expect(out).not.toContain('hero') // not in pool (anchored)
    expect(out).not.toContain('ourStory') // in pool but not in this registry
  })

  it('availableSwapTypes keeps current type first and omits types used elsewhere', () => {
    const out = availableSwapTypes(reg, sections, p, 'b', 'rsvp')
    expect(out[0]).toBe('rsvp') // current stays selectable
    expect(out).toContain('quote')
    expect(out).not.toContain('hero')
  })
})
