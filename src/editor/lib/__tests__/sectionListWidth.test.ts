import { describe, it, expect } from 'vitest'
import {
  clampSectionListWidth,
  fitSectionListWidth,
  parseStoredWidth,
  SECTION_LIST_WIDTH_DEFAULT,
  SECTION_LIST_WIDTH_MIN,
  SECTION_LIST_WIDTH_MAX,
} from '../sectionListWidth'

describe('fitSectionListWidth', () => {
  it('leaves a width alone when the viewport is roomy', () => {
    expect(fitSectionListWidth(400, 1920)).toBe(400)
  })

  it('caps a wide-monitor width on a narrow laptop', () => {
    // 45% of 1024 = 460 — a stored 520 must come down.
    expect(fitSectionListWidth(SECTION_LIST_WIDTH_MAX, 1024)).toBe(460)
  })

  it('never goes below MIN, even on a very narrow viewport', () => {
    // 45% of 700 = 315, but a 500 preference must not be cut past MIN either.
    expect(fitSectionListWidth(500, 700)).toBe(315)
    expect(fitSectionListWidth(500, 400)).toBe(SECTION_LIST_WIDTH_MIN)
  })

  it('ignores a nonsensical viewport rather than collapsing the panel', () => {
    expect(fitSectionListWidth(400, 0)).toBe(400)
    expect(fitSectionListWidth(400, Number.NaN)).toBe(400)
  })

  it('still clamps the incoming width itself', () => {
    expect(fitSectionListWidth(9999, 1920)).toBe(SECTION_LIST_WIDTH_MAX)
    expect(fitSectionListWidth(Number.NaN, 1920)).toBe(SECTION_LIST_WIDTH_DEFAULT)
  })
})

describe('clampSectionListWidth', () => {
  it('clamps a value below the minimum up to MIN', () => {
    expect(clampSectionListWidth(10)).toBe(SECTION_LIST_WIDTH_MIN)
  })

  it('clamps a value above the maximum down to MAX', () => {
    expect(clampSectionListWidth(9999)).toBe(SECTION_LIST_WIDTH_MAX)
  })

  it('keeps an in-range value as-is', () => {
    expect(clampSectionListWidth(320)).toBe(320)
  })

  it('rounds a fractional in-range value to the nearest integer', () => {
    expect(clampSectionListWidth(320.6)).toBe(321)
    expect(clampSectionListWidth(320.4)).toBe(320)
  })

  it('falls back to the default for non-finite input', () => {
    expect(clampSectionListWidth(NaN)).toBe(SECTION_LIST_WIDTH_DEFAULT)
    expect(clampSectionListWidth(Infinity)).toBe(SECTION_LIST_WIDTH_DEFAULT)
    expect(clampSectionListWidth(-Infinity)).toBe(SECTION_LIST_WIDTH_DEFAULT)
  })
})

describe('parseStoredWidth', () => {
  it('returns null for null input', () => {
    expect(parseStoredWidth(null)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseStoredWidth('')).toBeNull()
  })

  it('returns null for a non-numeric string', () => {
    expect(parseStoredWidth('abc')).toBeNull()
  })

  it('clamps an above-range stored value down to MAX', () => {
    expect(parseStoredWidth('999')).toBe(SECTION_LIST_WIDTH_MAX)
  })

  it('clamps a below-range stored value up to MIN', () => {
    expect(parseStoredWidth('100')).toBe(SECTION_LIST_WIDTH_MIN)
  })

  it('returns an in-range stored value unchanged', () => {
    expect(parseStoredWidth('320')).toBe(320)
  })
})
