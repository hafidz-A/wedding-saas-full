import { describe, it, expect } from 'vitest'
import { getSchemaRegistry, schemaRegistry } from '../schemas'
import { solarySchemaRegistry } from '../schemas/solary'

describe('getSchemaRegistry', () => {
  it('returns the lovebirds registry by default', () => {
    expect(getSchemaRegistry('lovebirds')).toBe(schemaRegistry)
  })
  it('returns the lovebirds registry for unknown templates', () => {
    expect(getSchemaRegistry('does-not-exist')).toBe(schemaRegistry)
  })
  it('returns the solary registry for solary', () => {
    expect(getSchemaRegistry('solary')).toBe(solarySchemaRegistry)
  })
})

describe('solarySchemaRegistry', () => {
  it('has all 10 existing solary section types', () => {
    const r = getSchemaRegistry('solary')
    for (const t of ['openingGate','welcomePlanet','storyPlanet','saturnRing','countdownPlanet','detailsPlanet','rsvpPlanet','teamPlanet','giftPlanet','footerPlanet']) {
      expect(r[t]).toBeTruthy()
      expect(r[t].fields.length).toBeGreaterThan(0)
    }
  })
})
