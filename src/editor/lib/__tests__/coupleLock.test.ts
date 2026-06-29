import { describe, it, expect } from 'vitest'
import { isCoupleField, isCoupleFieldLocked, shouldShowRelink, coupleSeedValues } from '../coupleLock'

type TestField = { key: string; linkedGroup?: 'couple' }
const coupleField: TestField = { key: 'coupleName', linkedGroup: 'couple' }
const brideField: TestField = { key: 'brideName', linkedGroup: 'couple' }
const groomField: TestField = { key: 'groomName', linkedGroup: 'couple' }
const plainField: TestField = { key: 'venue' }
const heroFields: TestField[] = [coupleField, brideField, groomField, plainField]
const couple = { name1: 'Amara', name2: 'Rizky' }

describe('isCoupleField', () => {
  it('is true only for linkedGroup === couple', () => {
    expect(isCoupleField(coupleField)).toBe(true)
    expect(isCoupleField(plainField)).toBe(false)
  })
})

describe('isCoupleFieldLocked', () => {
  it('locks a couple field when a couple exists and the section is not overridden', () => {
    expect(isCoupleFieldLocked(coupleField, {}, couple)).toBe(true)
  })
  it('leaves the field editable for a legacy invitation (no couple set)', () => {
    expect(isCoupleFieldLocked(coupleField, {}, {})).toBe(false)
    expect(isCoupleFieldLocked(coupleField, {}, undefined)).toBe(false)
  })
  it('leaves the field editable when the section overrides', () => {
    expect(isCoupleFieldLocked(coupleField, { coupleOverride: true }, couple)).toBe(false)
  })
  it('never locks a non-couple field', () => {
    expect(isCoupleFieldLocked(plainField, {}, couple)).toBe(false)
  })
})

describe('shouldShowRelink', () => {
  it('is true only with couple fields + a couple set + an active override', () => {
    expect(shouldShowRelink(heroFields, { coupleOverride: true }, couple)).toBe(true)
  })
  it('is false when not overridden', () => {
    expect(shouldShowRelink(heroFields, {}, couple)).toBe(false)
  })
  it('is false when no couple is set', () => {
    expect(shouldShowRelink(heroFields, { coupleOverride: true }, {})).toBe(false)
  })
  it('is false when the section has no couple fields', () => {
    expect(shouldShowRelink([plainField], { coupleOverride: true }, couple)).toBe(false)
  })
})

describe('coupleSeedValues', () => {
  it('returns inherited values for the couple fields only (hero injects bride/groom/couple)', () => {
    const seed = coupleSeedValues(
      { type: 'hero', props: { coupleName: 'OLD', brideName: 'OLD', groomName: 'OLD', venue: 'X' } },
      heroFields,
      couple,
    )
    expect(seed).toEqual({ coupleName: 'Amara & Rizky', brideName: 'Amara', groomName: 'Rizky' })
    expect('venue' in seed).toBe(false)
  })
  it('seeds only coupleName for footer/openingGate-style sections', () => {
    expect(coupleSeedValues({ type: 'footer', props: {} }, [coupleField, plainField], couple))
      .toEqual({ coupleName: 'Amara & Rizky' })
  })
})

// Interrelated lifecycle: a section's couple field moves locked → unlocked
// (seeded) → relinked (locked again) as the override flag flips. Asserts the
// predicates and the seed stay consistent across the whole cycle.
describe('lock lifecycle (locked → unlock → relink)', () => {
  it('transitions correctly as coupleOverride flips', () => {
    let props: Record<string, any> = {}

    // 1. Initially locked, no relink.
    expect(isCoupleFieldLocked(coupleField, props, couple)).toBe(true)
    expect(shouldShowRelink(heroFields, props, couple)).toBe(false)

    // 2. Unlock: seed inherited values, then set the override flag.
    const seed = coupleSeedValues({ type: 'hero', props }, heroFields, couple)
    props = { ...props, ...seed, coupleOverride: true }
    expect(props.coupleName).toBe('Amara & Rizky') // seeded from the inherited value
    expect(isCoupleFieldLocked(coupleField, props, couple)).toBe(false) // now editable
    expect(shouldShowRelink(heroFields, props, couple)).toBe(true) // relink now visible

    // 3. Relink: clear the override → field locks again, relink hides.
    props = { ...props, coupleOverride: false }
    expect(isCoupleFieldLocked(coupleField, props, couple)).toBe(true)
    expect(shouldShowRelink(heroFields, props, couple)).toBe(false)
  })
})
