import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder, isMandatoryType, availableSwapTypes } from '../templatePolicy'

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
