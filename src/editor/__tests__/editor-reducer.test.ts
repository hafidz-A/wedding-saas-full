import { describe, it, expect } from 'vitest'
import { reducer } from '../EditorProvider'

const base = {
  config: { sections: [
    { id: 'venus', type: 'teamPlanet', props: { planetKey: 'venus', planetName: 'Venus', heading: 'old' } },
    { id: 'mars', type: 'detailsPlanet', props: { planetKey: 'mars', planetName: 'Mars' } },
  ] },
  initialConfig: { sections: [] },
  selectedSectionId: 'venus',
  isSaving: false, saveError: null, lastSavedAt: null,
} as any

describe('CHANGE_SECTION_TYPE', () => {
  it('keeps planetKey/planetName, swaps type, applies defaults', () => {
    const next = reducer(base, { type: 'CHANGE_SECTION_TYPE', sectionId: 'venus', newType: 'faqPlanet', defaults: { heading: 'FAQ', items: [{ q: 'Q', a: 'A' }] } })
    const s = next.config.sections[0]
    expect(s.type).toBe('faqPlanet')
    expect(s.props.planetKey).toBe('venus')
    expect(s.props.planetName).toBe('Venus')
    expect(s.props.heading).toBe('FAQ')
    expect(s.props.items).toHaveLength(1)
    expect(s.props.old).toBeUndefined()
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
