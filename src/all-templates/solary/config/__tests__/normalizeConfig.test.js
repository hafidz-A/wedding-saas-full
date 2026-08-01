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

  it('a DISABLED saturnRing still reserves Saturn — the journey skips it (uranus → jupiter)', () => {
    const c = { sections: [
      { id: 'a', type: 'openingGate', props: {} },
      { id: 'w', type: 'welcomePlanet', props: {} },
      { id: 's', type: 'storyPlanet', props: {} },
      { id: 'g', type: 'saturnRing', enabled: false, props: {} },
      { id: 'c', type: 'countdownPlanet', props: {} },
      { id: 'z', type: 'footerPlanet', props: {} },
    ] }
    const keys = normalizeSolaryConfig(c).sections.map((s) => s.props.planetKey)
    // welcome=neptune, story=uranus, [saturn reserved & skipped], countdown=jupiter
    expect(keys[2]).toBe('uranus')
    expect(keys[4]).toBe('jupiter')
    // nothing else may claim Saturn just because the gallery is off
    expect(keys.filter((k) => k === 'saturn')).toEqual([])
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

  it('folds legacy story timeline photos[] into a single photo and drops the array', () => {
    const c = { sections: [
      { id: 'a', type: 'openingGate', props: {} },
      { id: 's', type: 'storyPlanet', props: { timeline: [
        { year: '2019', label: 'A', desc: '', photos: ['/one.jpg', '/two.jpg'] },
        { year: '2020', label: 'B', desc: '', photos: [] },
        { year: '2021', label: 'C', desc: '', photo: '/explicit.jpg', photos: ['/ignored.jpg'] },
      ] } },
      { id: 'z', type: 'footerPlanet', props: {} },
    ] }
    const out = normalizeSolaryConfig(c)
    const tl = out.sections.find((s) => s.type === 'storyPlanet').props.timeline
    expect(tl[0].photo).toBe('/one.jpg')
    expect(tl[0].photos).toBeUndefined()
    expect(tl[1].photo).toBe('')           // empty array → empty string
    expect(tl[2].photo).toBe('/explicit.jpg') // explicit photo wins over photos[0]
    expect(tl[2].photos).toBeUndefined()
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
