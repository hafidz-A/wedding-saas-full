import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder, computeSwapOrder, isSlotFixed, isMandatoryType, availableSwapTypes } from '../templatePolicy'

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

describe('mandatory RSVP/Gift locks', () => {
  const solary = getTemplatePolicy('solary')!
  const sections = [
    { id: 'neptune', type: 'welcomePlanet' },
    { id: 'earth', type: 'rsvpPlanet' },
    { id: 'mercury', type: 'giftPlanet' },
  ]
  const order = sections.map((s) => s.id)

  it('marks rsvp/gift mandatory', () => {
    expect(isMandatoryType('rsvpPlanet', solary)).toBe(true)
    expect(isMandatoryType('giftPlanet', solary)).toBe(true)
    expect(isMandatoryType('welcomePlanet', solary)).toBe(false)
  })

  it('refuses to drag a mandatory slot', () => {
    expect(computeSafeOrder(order, 'earth', 'neptune', solary, sections)).toBeNull()
  })

  it('refuses a move that would shift a mandatory slot index', () => {
    expect(computeSafeOrder(order, 'neptune', 'mercury', solary, sections)).toBeNull()
  })

  it('excludes mandatory types from swap options', () => {
    const reg: Record<string, unknown> = { welcomePlanet: {}, rsvpPlanet: {}, giftPlanet: {}, quotePlanet: {} }
    const opts = availableSwapTypes(reg, sections, solary, 'neptune', 'welcomePlanet')
    expect(opts).not.toContain('rsvpPlanet')
    expect(opts).not.toContain('giftPlanet')
  })
})

describe('computeSwapOrder (swap mode)', () => {
  const solary = getTemplatePolicy('solary')!
  // Mirrors the real Solary order: intro/saturn/sun position-locked, earth/mercury mandatory.
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

  it('swaps two free cards across a position-locked card, leaving it put', () => {
    const next = computeSwapOrder(solaryOrder, 'uranus', 'jupiter', solary, solarySections)
    expect(next).not.toBeNull()
    // saturn keeps its index (3); the two free cards exchanged.
    expect(next![3]).toBe('saturn')
    expect(next![2]).toBe('jupiter')
    expect(next![4]).toBe('uranus')
  })

  it('swaps two free cards across a mandatory card, leaving it put', () => {
    const next = computeSwapOrder(solaryOrder, 'mars', 'venus', solary, solarySections)
    expect(next).not.toBeNull()
    expect(next![6]).toBe('earth') // rsvp (mandatory) unmoved
    expect(next![5]).toBe('venus')
    expect(next![7]).toBe('mars')
  })

  it('rejects swapping onto a position-locked card', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'saturn', solary, solarySections)).toBeNull()
  })

  it('rejects swapping onto a mandatory card', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'earth', solary, solarySections)).toBeNull()
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

  it('isSlotFixed: locked id, anchored type, mandatory type are fixed; free is not', () => {
    expect(isSlotFixed({ id: 'saturn', type: 'saturnRing' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'earth', type: 'rsvpPlanet' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'uranus', type: 'storyPlanet' }, solary)).toBe(false)
    const lb = getTemplatePolicy('lovebirds')!
    expect(isSlotFixed({ id: 'h', type: 'hero' }, lb)).toBe(true)
  })
})
