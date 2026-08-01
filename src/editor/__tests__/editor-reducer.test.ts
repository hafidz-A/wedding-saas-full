import { describe, it, expect } from 'vitest'
import { reducer } from '../EditorProvider'

const base = {
  config: { sections: [
    { id: 'venus', type: 'teamPlanet', navLabel: 'Bridal Party', props: { planetKey: 'venus', planetName: 'Venus', sectionLabel: 'Bridal Party', heading: 'old' } },
    { id: 'mars', type: 'detailsPlanet', props: { planetKey: 'mars', planetName: 'Mars' } },
  ] },
  initialConfig: { sections: [] },
  selectedSectionId: 'venus',
  isSaving: false, saveError: null, lastSavedAt: null,
} as any

describe('CHANGE_SECTION_TYPE', () => {
  it('keeps planetKey/planetName, swaps type, applies defaults', () => {
    const next = reducer(base, { type: 'CHANGE_SECTION_TYPE', sectionId: 'venus', newType: 'faqPlanet', defaults: { sectionLabel: 'FAQ', heading: 'FAQ', items: [{ q: 'Q', a: 'A' }] } })
    const s = next.config.sections[0]
    expect(s.type).toBe('faqPlanet')
    expect(s.props.planetKey).toBe('venus')
    expect(s.props.planetName).toBe('Venus')
    expect(s.props.heading).toBe('FAQ')
    expect(s.props.items).toHaveLength(1)
    expect(s.props.old).toBeUndefined()
  })

  it('adopts the new type label and does NOT keep the old name (sectionLabel + navLabel)', () => {
    // Swap Bridal Party → Quote: the planet stays Venus but the visible name
    // must follow the new type, not linger as "Bridal Party".
    const next = reducer(base, { type: 'CHANGE_SECTION_TYPE', sectionId: 'venus', newType: 'quotePlanet', defaults: { sectionLabel: 'Quote', verse: 'v' } })
    const s = next.config.sections[0]
    expect(s.props.sectionLabel).toBe('Quote')
    expect(s.navLabel).toBe('Quote')
    expect(s.props.planetName).toBe('Venus') // physical planet preserved
    expect(s.props.heading).toBeUndefined()  // old content gone
  })

  it('clears navLabel when the new type has no sectionLabel default (lovebirds derives from its own map)', () => {
    const next = reducer(base, { type: 'CHANGE_SECTION_TYPE', sectionId: 'venus', newType: 'quote', defaults: { text: 'hi' } })
    expect(next.config.sections[0].navLabel).toBeUndefined()
  })
})

describe('CHANGE_SECTION_TYPE — gallery photo preservation', () => {
  const galBase = {
    config: { sections: [
      { id: 'g1', type: 'galleryMasonry', props: { photos: [{ src: 'a.jpg', alt: 'Hi' }] } },
    ] },
    initialConfig: { sections: [] }, selectedSectionId: 'g1',
    isSaving: false, saveError: null, lastSavedAt: null,
  } as any
  it('carries photos across masonry -> spring coil, mapping alt to caption', () => {
    const next = reducer(galBase, { type: 'CHANGE_SECTION_TYPE', sectionId: 'g1', newType: 'gallerySpringCoil', defaults: { photos: [{ src: 'default.jpg', caption: 'def' }], sectionTitle: 'X' } })
    const s = next.config.sections[0]
    expect(s.type).toBe('gallerySpringCoil')
    expect(s.props.photos).toEqual([{ src: 'a.jpg', alt: 'Hi', caption: 'Hi' }])
  })
})

describe('TOGGLE_SECTION_ENABLED', () => {
  it('undefined (renders as ON) flips to false on the first click, not true', () => {
    const withUndefinedEnabled = {
      config: { sections: [
        { id: 'venus', type: 'teamPlanet', props: {} },
      ] },
      initialConfig: { sections: [] }, selectedSectionId: 'venus',
      isSaving: false, saveError: null, lastSavedAt: null,
    } as any
    expect(withUndefinedEnabled.config.sections[0].enabled).toBeUndefined()
    const next = reducer(withUndefinedEnabled, { type: 'TOGGLE_SECTION_ENABLED', sectionId: 'venus' })
    expect(next.config.sections[0].enabled).toBe(false)
  })

  it('false -> true -> false round trip', () => {
    const withDisabled = {
      config: { sections: [
        { id: 'venus', type: 'teamPlanet', props: {}, enabled: false },
      ] },
      initialConfig: { sections: [] }, selectedSectionId: 'venus',
      isSaving: false, saveError: null, lastSavedAt: null,
    } as any
    const on = reducer(withDisabled, { type: 'TOGGLE_SECTION_ENABLED', sectionId: 'venus' })
    expect(on.config.sections[0].enabled).toBe(true)
    const off = reducer(on, { type: 'TOGGLE_SECTION_ENABLED', sectionId: 'venus' })
    expect(off.config.sections[0].enabled).toBe(false)
  })
})

describe('REORDER_SECTIONS_BY_ID', () => {
  it('reorders to match the id order', () => {
    const next = reducer(base, { type: 'REORDER_SECTIONS_BY_ID', order: ['mars', 'venus'] })
    expect(next.config.sections.map((s: any) => s.id)).toEqual(['mars', 'venus'])
  })
  it('ignores a non-permutation order', () => {
    const next = reducer(base, { type: 'REORDER_SECTIONS_BY_ID', order: ['mars'] })
    expect(next.config.sections.map((s: any) => s.id)).toEqual(['venus', 'mars'])
  })
})

describe('UPDATE_COUPLE', () => {
  const base = {
    config: { sections: [], couple: { name1: 'A', name2: 'B' } },
    initialConfig: { sections: [] },
    selectedSectionId: null,
    isSaving: false,
    saveError: null,
    lastSavedAt: null,
    baseSectionsHash: 'x',
  } as any

  it('sets a single couple name without dropping the other', () => {
    const next = reducer(base, { type: 'UPDATE_COUPLE', key: 'name1', value: 'Rani' } as any)
    expect(next.config.couple).toEqual({ name1: 'Rani', name2: 'B' })
  })
  it('initializes couple when absent', () => {
    const next = reducer({ ...base, config: { sections: [] } }, { type: 'UPDATE_COUPLE', key: 'name2', value: 'Adi' } as any)
    expect(next.config.couple).toEqual({ name2: 'Adi' })
  })
})
