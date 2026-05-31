import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder, isMandatoryType, availableSwapTypes } from '../templatePolicy'

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
  it('omits the other gallery if already used by another slot', () => {
    const sections = [{ id: 'g1', type: 'galleryMasonry' }, { id: 'g2', type: 'gallerySpringCoil' }]
    const opts = availableSwapTypes(reg, sections, lb, 'g1', 'galleryMasonry')
    expect(opts).toEqual(['galleryMasonry'])
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
