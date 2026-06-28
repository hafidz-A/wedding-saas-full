import { describe, it, expect } from 'vitest'
import {
  coupleDisplay, composeTitle, parseCoupleFromTitle, hasCouple,
  navName, injectCoupleProps, deriveCoupleFromConfig,
} from '../couple'

describe('coupleDisplay', () => {
  it('joins names with " & " and trims/collapses', () => {
    expect(coupleDisplay({ name1: '  Amara ', name2: 'Rizky ' })).toBe('Amara & Rizky')
  })
  it('drops an empty side without a dangling separator', () => {
    expect(coupleDisplay({ name1: 'Amara', name2: '' })).toBe('Amara')
    expect(coupleDisplay({})).toBe('')
    expect(coupleDisplay(null)).toBe('')
  })
})

describe('composeTitle', () => {
  it('appends the suffix after " — "', () => {
    expect(composeTitle({ name1: 'Amara', name2: 'Rizky' }, 'Our Wedding')).toBe('Amara & Rizky — Our Wedding')
  })
  it('omits the suffix segment when empty, and returns suffix alone when no names', () => {
    expect(composeTitle({ name1: 'Amara', name2: 'Rizky' }, '')).toBe('Amara & Rizky')
    expect(composeTitle({}, 'Our Wedding')).toBe('Our Wedding')
  })
})

describe('parseCoupleFromTitle', () => {
  it('splits "n1 & n2 — suffix"', () => {
    expect(parseCoupleFromTitle('Amara & Rizky — Our Wedding'))
      .toEqual({ name1: 'Amara', name2: 'Rizky', titleSuffix: 'Our Wedding' })
  })
  it('handles no em-dash and extra ampersands', () => {
    expect(parseCoupleFromTitle('Amara & Rizky')).toEqual({ name1: 'Amara', name2: 'Rizky', titleSuffix: '' })
    expect(parseCoupleFromTitle('A & B & C — Day')).toEqual({ name1: 'A', name2: 'B & C', titleSuffix: 'Day' })
    expect(parseCoupleFromTitle(undefined)).toEqual({ name1: '', name2: '', titleSuffix: '' })
  })
})

describe('hasCouple', () => {
  it('is true only when at least one name is non-empty', () => {
    expect(hasCouple({ name1: 'Amara' })).toBe(true)
    expect(hasCouple({ name1: '  ', name2: '' })).toBe(false)
    expect(hasCouple(undefined)).toBe(false)
  })
})

describe('navName', () => {
  it('prefers config.couple, then legacy meta.title, then fallback', () => {
    expect(navName({ couple: { name1: 'Amara', name2: 'Rizky' }, meta: { title: 'ignore — x' } })).toBe('Amara & Rizky')
    expect(navName({ meta: { title: 'Amara & Rizky — Our Wedding' } })).toBe('Amara & Rizky')
    expect(navName({}, 'Galactic')).toBe('Galactic')
  })
})

describe('injectCoupleProps', () => {
  const couple = { name1: 'Amara', name2: 'Rizky' }
  it('injects bride/groom/couple for hero', () => {
    const out = injectCoupleProps({ type: 'hero', props: { brideName: 'OLD', groomName: 'OLD', coupleName: 'OLD' } }, couple)
    expect(out).toMatchObject({ brideName: 'Amara', groomName: 'Rizky', coupleName: 'Amara & Rizky' })
  })
  it('injects coupleName for footer and openingGate', () => {
    expect(injectCoupleProps({ type: 'footer', props: { coupleName: 'OLD' } }, couple).coupleName).toBe('Amara & Rizky')
    expect(injectCoupleProps({ type: 'openingGate', props: {} }, couple).coupleName).toBe('Amara & Rizky')
  })
  it('passes through when overridden, when couple empty, or for non-couple types', () => {
    expect(injectCoupleProps({ type: 'hero', props: { coupleName: 'OLD', coupleOverride: true } }, couple).coupleName).toBe('OLD')
    expect(injectCoupleProps({ type: 'hero', props: { coupleName: 'OLD' } }, {}).coupleName).toBe('OLD')
    expect(injectCoupleProps({ type: 'gallery', props: { x: 1 } }, couple)).toEqual({ x: 1 })
  })
})

describe('deriveCoupleFromConfig', () => {
  it('uses existing config.couple when present', () => {
    expect(deriveCoupleFromConfig({ couple: { name1: 'A', name2: 'B' } })).toEqual({ name1: 'A', name2: 'B' })
  })
  it('falls back to hero bride/groom, then hero coupleName, then meta.title', () => {
    expect(deriveCoupleFromConfig({ sections: [{ type: 'hero', props: { brideName: 'Amara', groomName: 'Rizky' } }] }))
      .toEqual({ name1: 'Amara', name2: 'Rizky' })
    expect(deriveCoupleFromConfig({ sections: [{ type: 'hero', props: { coupleName: 'Amara & Rizky' } }] }))
      .toEqual({ name1: 'Amara', name2: 'Rizky' })
    expect(deriveCoupleFromConfig({ meta: { title: 'Amara & Rizky — Our Wedding' } }))
      .toEqual({ name1: 'Amara', name2: 'Rizky' })
  })
})
