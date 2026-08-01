import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder, computeSwapOrder, isSlotFixed, needsDisableConfirm, availableSwapTypes } from '../templatePolicy'

describe('lovebirds gallery swap group', () => {
  const lb = getTemplatePolicy('lovebirds')!
  const reg: Record<string, unknown> = {
    galleryMasonry: {}, gallerySpringCoil: {}, quote: {}, rsvp: {}, weddingGift: {}, faq: {},
  }
  it('a masonry gallery only offers the two galleries', () => {
    const sections = [{ id: 'g1', type: 'galleryMasonry' }, { id: 'q', type: 'quote' }]
    const opts = availableSwapTypes(reg, sections, lb, 'g1', 'galleryMasonry')
    expect(new Set(opts)).toEqual(new Set(['galleryMasonry', 'gallerySpringCoil']))
  })
  it('lets the single gallery slot swap to the other gallery type (1 gallery per invitation)', () => {
    // Single-instance model: an invitation has exactly one gallery slot, which
    // may switch between the two gallery types. Current type comes first.
    const sections = [{ id: 'g1', type: 'galleryMasonry' }]
    const opts = availableSwapTypes(reg, sections, lb, 'g1', 'galleryMasonry')
    expect(opts).toEqual(['galleryMasonry', 'gallerySpringCoil'])
  })
})

describe('RSVP/Gift are unlocked (only the confirm-on-disable behavior remains)', () => {
  const lb = getTemplatePolicy('lovebirds')!
  const solary = getTemplatePolicy('solary')!
  const solarySections = [
    { id: 'neptune', type: 'welcomePlanet' },
    { id: 'earth', type: 'rsvpPlanet' },
    { id: 'mercury', type: 'giftPlanet' },
  ]
  const solaryOrder = solarySections.map((s) => s.id)

  it('lovebirds: rsvp/weddingGift are not slot-fixed — draggable and swappable', () => {
    expect(isSlotFixed({ id: 'rsvp-1', type: 'rsvp' }, lb)).toBe(false)
    expect(isSlotFixed({ id: 'gift-1', type: 'weddingGift' }, lb)).toBe(false)
  })

  it('solary: rsvpPlanet/giftPlanet are not slot-fixed — draggable and swappable', () => {
    expect(isSlotFixed({ id: 'earth', type: 'rsvpPlanet' }, solary)).toBe(false)
    expect(isSlotFixed({ id: 'mercury', type: 'giftPlanet' }, solary)).toBe(false)
  })

  it('solary: a former-mandatory slot can now be dragged and reordered freely', () => {
    expect(computeSafeOrder(solaryOrder, 'earth', 'neptune', solary)).not.toBeNull()
    expect(computeSafeOrder(solaryOrder, 'neptune', 'mercury', solary)).not.toBeNull()
  })

  it('rsvpPlanet/giftPlanet are offered as swap options (no longer excluded)', () => {
    // Only 'neptune' exists here — rsvpPlanet/giftPlanet aren't used by any
    // OTHER section, so the old mandatoryTypes filter was the only thing that
    // could have excluded them. With it gone, they must be offered.
    const reg: Record<string, unknown> = { welcomePlanet: {}, rsvpPlanet: {}, giftPlanet: {}, quotePlanet: {} }
    const soloSection = [{ id: 'neptune', type: 'welcomePlanet' }]
    const opts = availableSwapTypes(reg, soloSection, solary, 'neptune', 'welcomePlanet')
    expect(opts).toContain('rsvpPlanet')
    expect(opts).toContain('giftPlanet')
  })

  it('needsDisableConfirm is true for exactly rsvp/weddingGift (lovebirds) and rsvpPlanet/giftPlanet (solary)', () => {
    expect(needsDisableConfirm('rsvp', lb)).toBe(true)
    expect(needsDisableConfirm('weddingGift', lb)).toBe(true)
    expect(needsDisableConfirm('rsvpPlanet', solary)).toBe(true)
    expect(needsDisableConfirm('giftPlanet', solary)).toBe(true)

    expect(needsDisableConfirm('hero', lb)).toBe(false)
    expect(needsDisableConfirm('footer', lb)).toBe(false)
    expect(needsDisableConfirm('quote', lb)).toBe(false)
    expect(needsDisableConfirm('welcomePlanet', solary)).toBe(false)
    expect(needsDisableConfirm('anything', null)).toBe(false)
  })
})

describe('computeSwapOrder (swap mode)', () => {
  const solary = getTemplatePolicy('solary')!
  // Mirrors the real Solary order: intro/saturn/sun stay position-locked, while
  // earth/mercury (RSVP/gift) are now free like every other planet. Saturn keeps
  // its position lock but — unlike intro/sun — can still be switched off.
  const solarySections = [
    { id: 'intro', type: 'openingGate' },
    { id: 'neptune', type: 'welcomePlanet' },
    { id: 'uranus', type: 'storyPlanet' },
    { id: 'saturn', type: 'saturnRing' },
    { id: 'jupiter', type: 'countdownPlanet' },
    { id: 'mars', type: 'detailsPlanet' },
    { id: 'earth', type: 'rsvpPlanet' },
    { id: 'venus', type: 'teamPlanet' },
    { id: 'mercury', type: 'giftPlanet' },
    { id: 'sun', type: 'footerPlanet' },
  ]
  const solaryOrder = solarySections.map((s) => s.id)

  it('swaps two free cards, leaving everything in between untouched', () => {
    const next = computeSwapOrder(solaryOrder, 'uranus', 'jupiter', solary, solarySections)
    expect(next).not.toBeNull()
    // saturn sits between them at index 3 and is untouched — swap only moves
    // its two named endpoints, regardless of what's between them.
    expect(next![3]).toBe('saturn')
    expect(next![2]).toBe('jupiter')
    expect(next![4]).toBe('uranus')
  })

  it('swaps two free cards across the former "mandatory" rsvp slot, leaving it put', () => {
    const next = computeSwapOrder(solaryOrder, 'mars', 'venus', solary, solarySections)
    expect(next).not.toBeNull()
    expect(next![6]).toBe('earth') // rsvp sits between them, untouched
    expect(next![5]).toBe('venus')
    expect(next![7]).toBe('mars')
  })

  it('rejects swapping onto a position-locked card (intro/sun)', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'intro', solary, solarySections)).toBeNull()
    expect(computeSwapOrder(solaryOrder, 'uranus', 'sun', solary, solarySections)).toBeNull()
  })

  it('allows swapping onto the former-mandatory rsvp/gift slots (now free)', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'earth', solary, solarySections)).not.toBeNull()
    expect(computeSwapOrder(solaryOrder, 'uranus', 'mercury', solary, solarySections)).not.toBeNull()
  })

  it('still rejects swapping onto saturn — the photo ring is parented to the planet', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'saturn', solary, solarySections)).toBeNull()
    expect(computeSwapOrder(solaryOrder, 'saturn', 'uranus', solary, solarySections)).toBeNull()
  })

  it('rejects active === over', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'uranus', solary, solarySections)).toBeNull()
  })

  it('lovebirds: swaps two free cards across rsvp; rejects swapping onto an anchor', () => {
    const lb = getTemplatePolicy('lovebirds')!
    const lbSections = [
      { id: 'h', type: 'hero' },
      { id: 'q', type: 'quote' },
      { id: 'r', type: 'rsvp' },
      { id: 's', type: 'schedule' },
      { id: 'f', type: 'footer' },
    ]
    const lbOrder = lbSections.map((s) => s.id)
    const ok = computeSwapOrder(lbOrder, 'q', 's', lb, lbSections)
    expect(ok).toEqual(['h', 's', 'r', 'q', 'f'])
    // hero is anchored — can't be a swap target.
    expect(computeSwapOrder(lbOrder, 'q', 'h', lb, lbSections)).toBeNull()
  })

  it('isSlotFixed: only locked-id/anchored-type slots are fixed; rsvp/gift are free', () => {
    expect(isSlotFixed({ id: 'intro', type: 'openingGate' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'sun', type: 'footerPlanet' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'saturn', type: 'saturnRing' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'earth', type: 'rsvpPlanet' }, solary)).toBe(false)
    expect(isSlotFixed({ id: 'uranus', type: 'storyPlanet' }, solary)).toBe(false)
    const lb = getTemplatePolicy('lovebirds')!
    expect(isSlotFixed({ id: 'h', type: 'hero' }, lb)).toBe(true)
  })
})
