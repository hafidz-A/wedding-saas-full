import { describe, it, expect } from 'vitest'
import { isPaletteAllowedForTemplate } from '../palette-allowlist'

describe('isPaletteAllowedForTemplate', () => {
  it('accepts lovebirds palettes for lovebirds', () => {
    expect(isPaletteAllowedForTemplate('lovebirds', 'blossomVelvet')).toBe(true)
    expect(isPaletteAllowedForTemplate('lovebirds', 'midnightStardust')).toBe(true)
    expect(isPaletteAllowedForTemplate('lovebirds', 'warmCream')).toBe(true)
  })
  it('rejects solary palettes for lovebirds', () => {
    expect(isPaletteAllowedForTemplate('lovebirds', 'cosmicDark')).toBe(false)
  })
  it('accepts solary palettes for solary', () => {
    expect(isPaletteAllowedForTemplate('solary', 'cosmicDark')).toBe(true)
  })
  it('rejects lovebirds palettes for solary', () => {
    expect(isPaletteAllowedForTemplate('solary', 'blossomVelvet')).toBe(false)
  })
  it('falls back to the union when template is null/unknown', () => {
    expect(isPaletteAllowedForTemplate(null, 'warmCream')).toBe(true)
    expect(isPaletteAllowedForTemplate(null, 'cosmicDark')).toBe(true)
    expect(isPaletteAllowedForTemplate('mystery', 'nope')).toBe(false)
  })
})
