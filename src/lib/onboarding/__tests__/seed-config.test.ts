import { describe, it, expect } from 'vitest'
import { buildSeedConfig, validateSlug } from '../seed-config'

describe('validateSlug', () => {
  it('accepts a clean slug and returns it unchanged', () => {
    expect(validateSlug('adi-rani')).toBe('adi-rani')
  })

  it('lowercases and trims', () => {
    expect(validateSlug('  Adi-Rani  ')).toBe('adi-rani')
  })

  it('accepts digits', () => {
    expect(validateSlug('a1-b2-2026')).toBe('a1-b2-2026')
  })

  it('rejects too short (<3) and too long (>40)', () => {
    expect(() => validateSlug('ab')).toThrow(/3.*40|karakter/)
    expect(() => validateSlug('a'.repeat(41))).toThrow(/3.*40|karakter/)
  })

  it('rejects spaces and illegal characters', () => {
    expect(() => validateSlug('has space')).toThrow()
    expect(() => validateSlug('under_score')).toThrow()
    expect(() => validateSlug('emoji😀slug')).toThrow()
  })

  it('rejects leading/trailing and double hyphens', () => {
    expect(() => validateSlug('-leading')).toThrow()
    expect(() => validateSlug('trailing-')).toThrow()
    expect(() => validateSlug('double--hyphen')).toThrow()
  })
})

describe('buildSeedConfig', () => {
  const input = {
    brideName: 'Rani Sastrawijaya',
    groomName: 'Adi Pratama',
    weddingDate: '2025-11-15T16:00',
    venue: 'The Grand Ballroom, Jakarta',
  }

  it('derives couple name from first names', () => {
    const cfg = buildSeedConfig(input)
    const hero = cfg.sections.find((s: any) => s.type === 'hero')
    expect(hero).toBeDefined()
    expect(hero.props.coupleName).toBe('Rani & Adi')
    expect(hero.props.brideName).toBe('Rani')
    expect(hero.props.groomName).toBe('Adi')
  })

  it('derives monogram and hashtag on the footer', () => {
    const cfg = buildSeedConfig(input)
    const footer = cfg.sections.find((s: any) => s.type === 'footer')
    expect(footer).toBeDefined()
    expect(footer.props.monogram).toBe('R & A')
    expect(footer.props.hashtag).toBe('#RaniAndAdi')
  })

  it('sets meta title and enables every section (full template)', () => {
    const cfg = buildSeedConfig(input)
    expect(cfg.couple).toEqual({ name1: 'Rani', name2: 'Adi' })
    expect(cfg.meta.titleSuffix).toBe('Our Wedding')
    expect(cfg.sections.every((s: any) => s.enabled === true)).toBe(true)
  })

  it('does NOT mutate the shared default template between calls', () => {
    const a = buildSeedConfig(input)
    const b = buildSeedConfig({ ...input, brideName: 'Other Person', groomName: 'Someone Else' })
    const heroA = a.sections.find((s: any) => s.type === 'hero')
    const heroB = b.sections.find((s: any) => s.type === 'hero')
    // First result must be untouched by the second call (deep clone, not shared ref).
    expect(heroA.props.coupleName).toBe('Rani & Adi')
    expect(heroB.props.coupleName).toBe('Other & Someone')
  })
})
