import { describe, it, expect } from 'vitest'
import { normalizeSolaryConfig } from '../normalizeConfig.js'

const cfg = (types) => ({
  sections: types.map((type, i) => ({ id: `s${i}`, type, props: { sectionLabel: 'x' } })),
})

describe('normalizeSolaryConfig — positional planets', () => {
  it('assigns planets by slot: intro=andromeda, footer=sun, middle in pool order', () => {
    const out = normalizeSolaryConfig(cfg(['openingGate', 'welcomePlanet', 'storyPlanet', 'footerPlanet']))
    const keys = out.sections.map((s) => s.props.planetKey)
    expect(keys).toEqual(['andromeda', 'neptune', 'uranus', 'sun'])
  })

  it('is positional: a section moved to a new slot adopts that slot\'s planet', () => {
    const out = normalizeSolaryConfig(cfg(['openingGate', 'storyPlanet', 'welcomePlanet', 'footerPlanet']))
    const welcome = out.sections.find((s) => s.type === 'welcomePlanet')
    expect(welcome.props.planetKey).toBe('uranus')
    expect(welcome.props.planetName).toBe('Uranus')
  })

  it('overrides any stored planetKey with the positional one', () => {
    const c = { sections: [
      { id: 'a', type: 'openingGate', props: {} },
      { id: 'b', type: 'welcomePlanet', props: { planetKey: 'mercury', planetName: 'Mercury' } },
      { id: 'z', type: 'footerPlanet', props: {} },
    ] }
    const out = normalizeSolaryConfig(c)
    expect(out.sections[1].props.planetKey).toBe('neptune')
    expect(out.sections[1].props.planetName).toBe('Neptune')
  })
})
