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

  it('pins saturnRing to saturn regardless of slot (photo ring lives on Saturn)', () => {
    const out = normalizeSolaryConfig(cfg(['openingGate', 'saturnRing', 'welcomePlanet', 'footerPlanet']))
    const gallery = out.sections.find((s) => s.type === 'saturnRing')
    expect(gallery.props.planetKey).toBe('saturn')
    // saturn is reserved — the other middle section must not get it
    const welcome = out.sections.find((s) => s.type === 'welcomePlanet')
    expect(welcome.props.planetKey).not.toBe('saturn')
  })

  it('disabled sections do not consume a planet from the pool', () => {
    const c = { sections: [
      { id: 'a', type: 'openingGate', props: {} },
      { id: 'w', type: 'welcomePlanet', enabled: false, props: {} },
      { id: 's', type: 'storyPlanet', props: {} },
      { id: 'z', type: 'footerPlanet', props: {} },
    ] }
    const out = normalizeSolaryConfig(c)
    const story = out.sections.find((s) => s.type === 'storyPlanet')
    expect(story.props.planetKey).toBe('neptune') // first pool slot, not shifted by the disabled welcome
  })

  it('cycles the pool instead of falling back to andromeda when sections exceed pool size', () => {
    const middles = [
      'welcomePlanet', 'storyPlanet', 'countdownPlanet', 'detailsPlanet', 'rsvpPlanet',
      'teamPlanet', 'giftPlanet', 'quotePlanet', 'schedulePlanet', 'liveStreamPlanet', 'faqPlanet',
    ]
    const out = normalizeSolaryConfig(cfg(['openingGate', ...middles, 'footerPlanet']))
    const middleKeys = out.sections.slice(1, -1).map((s) => s.props.planetKey)
    expect(middleKeys).not.toContain('andromeda') // andromeda = solar system fades out
    expect(middleKeys).not.toContain('sun')
  })

  it('default 8-middle arrangement keeps its canonical planets (incl. gallery on saturn)', () => {
    const out = normalizeSolaryConfig(cfg([
      'openingGate', 'welcomePlanet', 'storyPlanet', 'saturnRing', 'countdownPlanet',
      'detailsPlanet', 'rsvpPlanet', 'teamPlanet', 'giftPlanet', 'footerPlanet',
    ]))
    expect(out.sections.map((s) => s.props.planetKey)).toEqual([
      'andromeda', 'neptune', 'uranus', 'saturn', 'jupiter', 'mars', 'earth', 'venus', 'mercury', 'sun',
    ])
  })
})
