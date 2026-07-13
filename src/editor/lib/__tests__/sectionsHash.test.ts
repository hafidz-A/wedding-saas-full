import { describe, it, expect } from 'vitest'
import { hashSections } from '../sectionsHash'

const sections = [
  { id: 'hero', type: 'hero', props: { coupleName: 'Rani & Adi', date: '2026-11-15' } },
  { id: 'story', type: 'ourStory', props: { cards: [{ title: 'First Meet' }] } },
]

describe('hashSections', () => {
  it('is deterministic for identical input', () => {
    expect(hashSections(sections)).toBe(hashSections(sections))
  })

  it('ignores object key ORDER (server and client serialize independently)', () => {
    const reordered = [
      { props: { date: '2026-11-15', coupleName: 'Rani & Adi' }, type: 'hero', id: 'hero' },
      { type: 'ourStory', props: { cards: [{ title: 'First Meet' }] }, id: 'story' },
    ]
    expect(hashSections(reordered)).toBe(hashSections(sections))
  })

  it('is SENSITIVE to section content changes (a real conflict)', () => {
    const edited = structuredClone(sections)
    edited[0].props.coupleName = 'Someone Else'
    expect(hashSections(edited)).not.toBe(hashSections(sections))
  })

  it('is SENSITIVE to section reordering (array order is meaningful)', () => {
    const swapped = [sections[1], sections[0]]
    expect(hashSections(swapped)).not.toBe(hashSections(sections))
  })

  it('normalizes missing/non-array input to an empty list', () => {
    const empty = hashSections([])
    expect(hashSections(undefined)).toBe(empty)
    expect(hashSections(null)).toBe(empty)
    expect(hashSections({} as unknown)).toBe(empty)
  })

  it('is unaffected by sibling config keys — it only ever sees the sections array', () => {
    // The whole point: palette/music/meta live outside `sections`, so a section
    // editor that hashes only `config.sections` can never see a sub-tab change.
    const cfgA = { sections, music: { url: 'a.mp3' }, theme: { defaultPalette: 'gold' } }
    const cfgB = { sections, music: { url: 'TOTALLY-DIFFERENT.mp3' }, theme: { defaultPalette: 'rose' } }
    expect(hashSections(cfgA.sections)).toBe(hashSections(cfgB.sections))
  })

  it('produces a short stable hex token', () => {
    expect(hashSections(sections)).toMatch(/^[0-9a-f]{8}$/)
  })
})
