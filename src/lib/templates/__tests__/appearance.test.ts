import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_ORNAMENTS,
  templateOrnaments,
  isOrnamentAllowedForTemplate,
  templatePalettes,
} from '../appearance'
import { TEMPLATE_PALETTES } from '@/lib/config/palette-allowlist'

describe('templateOrnaments / isOrnamentAllowedForTemplate', () => {
  it('Lovebirds accepts its three ornaments', () => {
    expect(templateOrnaments('lovebirds').map((o) => o.key)).toEqual(['birds', 'butterflies', 'perched'])
    for (const key of ['birds', 'butterflies', 'perched']) {
      expect(isOrnamentAllowedForTemplate('lovebirds', key)).toBe(true)
    }
  })

  it('Solary rejects every ornament (known template, empty list)', () => {
    expect(templateOrnaments('solary')).toEqual([])
    for (const key of ['birds', 'butterflies', 'perched', 'anything']) {
      expect(isOrnamentAllowedForTemplate('solary', key)).toBe(false)
    }
  })

  it('unknown/legacy template is lenient (accepts any key known to any template)', () => {
    expect(isOrnamentAllowedForTemplate('classic', 'birds')).toBe(true)
    expect(isOrnamentAllowedForTemplate(null, 'perched')).toBe(true)
    expect(isOrnamentAllowedForTemplate(undefined, 'butterflies')).toBe(true)
    expect(isOrnamentAllowedForTemplate('classic', 'not-a-real-key')).toBe(false)
    // templateOrnaments returns the full union for an unknown template.
    const union = templateOrnaments('classic').map((o) => o.key)
    expect(union).toEqual(
      Object.values(TEMPLATE_ORNAMENTS).flat().map((o) => o.key),
    )
  })
})

describe('templatePalettes delegates to the palette allowlist', () => {
  it('matches TEMPLATE_PALETTES for known templates', () => {
    expect(templatePalettes('lovebirds')).toEqual(TEMPLATE_PALETTES.lovebirds)
    expect(templatePalettes('solary')).toEqual(TEMPLATE_PALETTES.solary)
  })

  it('returns empty for an unknown template', () => {
    expect(templatePalettes('classic')).toEqual([])
  })
})
