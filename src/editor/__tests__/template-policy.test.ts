import { describe, it, expect } from 'vitest'
import {
  getTemplatePolicy,
  computeSafeOrder,
  availableAddTypes,
  availableSwapTypes,
  canAddSections,
  canRemoveSectionType,
  validateSectionsAgainstPolicy,
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

describe('lovebirds gallery single-instance', () => {
  const registry: Record<string, unknown> = {
    hero: {}, footer: {}, quote: {}, ourStory: {}, eventDetails: {},
    brideGroom: {}, weddingParty: {}, galleryMasonry: {}, gallerySpringCoil: {},
    schedule: {}, rsvp: {}, weddingGift: {}, accommodations: {}, faq: {},
  }
  const p = getTemplatePolicy('lovebirds')!

  it('does not offer the other gallery to a non-gallery section when a gallery exists', () => {
    const sections = [
      { id: 's-quote', type: 'quote' },
      { id: 's-gal', type: 'galleryMasonry' },
    ]
    const opts = availableSwapTypes(registry, sections, p, 's-quote', 'quote')
    expect(opts).not.toContain('gallerySpringCoil')
    expect(opts).not.toContain('galleryMasonry')
  })

  it('does not offer the other gallery in the add menu when a gallery exists', () => {
    const sections = [{ type: 'galleryMasonry' }]
    const opts = availableAddTypes(registry, sections, p)
    expect(opts).not.toContain('gallerySpringCoil')
    expect(opts).not.toContain('galleryMasonry')
  })

  it('still lets a gallery section swap to the other gallery type', () => {
    const sections = [{ id: 's-gal', type: 'galleryMasonry' }]
    const opts = availableSwapTypes(registry, sections, p, 's-gal', 'galleryMasonry')
    expect(opts).toContain('galleryMasonry')      // current type stays selectable
    expect(opts).toContain('gallerySpringCoil')   // swap target stays offered
  })

  it('offers both gallery types when no gallery exists yet', () => {
    const sections = [{ type: 'quote' }]
    const opts = availableAddTypes(registry, sections, p)
    expect(opts).toContain('galleryMasonry')
    expect(opts).toContain('gallerySpringCoil')
  })
})

describe('section count locking', () => {
  const lb = getTemplatePolicy('lovebirds')!
  const sol = getTemplatePolicy('solary')!

  it('lovebirds: adding sections is disabled', () => {
    expect(canAddSections(lb)).toBe(false)
  })

  it('lovebirds: removing any section is disabled (even normally-removable types)', () => {
    expect(canRemoveSectionType('quote', lb)).toBe(false)
    expect(canRemoveSectionType('galleryMasonry', lb)).toBe(false)
    expect(canRemoveSectionType('hero', lb)).toBe(false)
  })

  it('solary: adding disabled via fixedSections', () => {
    expect(canAddSections(sol)).toBe(false)
  })

  it('no policy: add + remove allowed', () => {
    expect(canAddSections(null)).toBe(true)
    expect(canRemoveSectionType('quote', null)).toBe(true)
  })
})

describe('validateSectionsAgainstPolicy (server-side config guard)', () => {
  // A realistic lovebirds saved config: hero + footer (locked types),
  // rsvp + weddingGift (mandatory), plus a couple of swappable sections.
  const lovebirdsPrev = [
    { id: 'hero-1', type: 'hero' },
    { id: 'story-1', type: 'ourStory' },
    { id: 'rsvp-1', type: 'rsvp' },
    { id: 'gift-1', type: 'weddingGift' },
    { id: 'footer-1', type: 'footer' },
  ]
  // A realistic solary saved config: locked-by-id intro/saturn/sun + mandatory
  // rsvpPlanet/giftPlanet + a swappable planet.
  const solaryPrev = [
    { id: 'intro', type: 'intro' },
    { id: 'venus', type: 'storyPlanet' },
    { id: 'mars', type: 'rsvpPlanet' },
    { id: 'jupiter', type: 'giftPlanet' },
    { id: 'saturn', type: 'saturn' },
    { id: 'sun', type: 'sun' },
  ]

  it('returns null for an unknown template (no policy → no extra constraint)', () => {
    expect(validateSectionsAgainstPolicy('mystery', [{ id: 'a', type: 'x' }], null)).toBeNull()
  })

  it('accepts a same-count reorder/edit (the normal editor save)', () => {
    const reordered = [...lovebirdsPrev].reverse()
    expect(validateSectionsAgainstPolicy('lovebirds', reordered, lovebirdsPrev)).toBeNull()
    const solReordered = [...solaryPrev].reverse()
    expect(validateSectionsAgainstPolicy('solary', solReordered, solaryPrev)).toBeNull()
  })

  it('rejects dropping a mandatory section (lovebirds rsvp / weddingGift)', () => {
    const noRsvp = lovebirdsPrev.filter((s) => s.type !== 'rsvp')
    const v = validateSectionsAgainstPolicy('lovebirds', noRsvp, lovebirdsPrev)
    expect(v?.code).toBe('missing_mandatory')
  })

  it('rejects dropping a mandatory planet (solary giftPlanet)', () => {
    const noGift = solaryPrev.filter((s) => s.type !== 'giftPlanet')
    const v = validateSectionsAgainstPolicy('solary', noGift, solaryPrev)
    expect(v?.code).toBe('missing_mandatory')
  })

  it('rejects dropping a locked-by-type anchor (lovebirds hero/footer)', () => {
    // Keep mandatory present so the locked-type check is what trips.
    const noFooter = lovebirdsPrev.filter((s) => s.type !== 'footer')
    const v = validateSectionsAgainstPolicy('lovebirds', noFooter, lovebirdsPrev)
    expect(['missing_locked_type', 'count_changed']).toContain(v?.code)
  })

  it('rejects dropping a locked-by-id slot (solary intro)', () => {
    const noIntro = solaryPrev.filter((s) => s.id !== 'intro')
    const v = validateSectionsAgainstPolicy('solary', noIntro, solaryPrev)
    expect(['missing_locked_slot', 'count_changed']).toContain(v?.code)
  })

  it('rejects an absurd section count on a fixed-count template (the "30 sections" attack)', () => {
    const thirty = Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, type: 'ourStory' }))
    // keep mandatory + locked present so only the count check can trip
    const attack = [...lovebirdsPrev, ...thirty]
    const v = validateSectionsAgainstPolicy('lovebirds', attack, lovebirdsPrev)
    expect(v?.code).toBe('count_changed')
  })

  it('skips the count check on first save (no previous config)', () => {
    expect(validateSectionsAgainstPolicy('lovebirds', lovebirdsPrev, null)).toBeNull()
  })
})
