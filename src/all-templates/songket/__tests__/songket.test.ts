import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defaultConfig } from '../defaultConfig.js'
import { sectionRegistry } from '../registry.js'
import { SONGKET_SECTION_TYPES } from '../config/sectionTypes.js'
import { PALETTES, ORNAMENTS } from '../config/theme.js'
import { encryptConfig, decryptConfig } from '@/lib/crypto/config'
import { TEMPLATE_PALETTES, isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'
import { TEMPLATE_ORNAMENTS, isOrnamentAllowedForTemplate } from '@/lib/templates/appearance'
import { getSchemaRegistry } from '@/editor/schemas'
import { getTemplatePolicy } from '@/editor/templatePolicy'
import { isValidTemplate } from '@/config/templateIndex'
import { templateCatalog } from '@/config/templateCatalog'
import { config as middlewareConfig } from '@/middleware'

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

const types = (defaultConfig.sections as Array<{ type: string }>).map((s) => s.type)

describe('songket wiring', () => {
  it('registry maps exactly the declared section types', () => {
    expect(Object.keys(sectionRegistry).sort()).toEqual([...SONGKET_SECTION_TYPES].sort())
  })

  it('every section in the demo config has a renderer and an editor schema', () => {
    const schemas = getSchemaRegistry('songket')
    for (const t of types) {
      expect(sectionRegistry).toHaveProperty(t)
      expect(schemas[t], `schema for ${t}`).toBeDefined()
    }
  })

  it('editor schemas offer only types Songket can render', () => {
    expect(Object.keys(getSchemaRegistry('songket')).sort()).toEqual([...SONGKET_SECTION_TYPES].sort())
  })

  it('policy pool and anchors stay inside the renderable set', () => {
    const policy = getTemplatePolicy('songket')!
    expect(policy).not.toBeNull()
    for (const t of [...policy.swappablePool, policy.anchorFirstType, policy.anchorLastType]) {
      expect(SONGKET_SECTION_TYPES).toContain(t)
    }
    expect(types[0]).toBe('hero')
    expect(types[types.length - 1]).toBe('footer')
    expect(types.length).toBeLessThanOrEqual(policy.maxSections!)
  })

  it('renders at /songket/<slug> but is not in the sellable catalog yet (uji coba)', () => {
    expect(isValidTemplate('songket')).toBe(true)
    expect(templateCatalog.map((t: { id: string }) => t.id)).not.toContain('songket')
  })

  it('middleware covers the public page and the dashboard', () => {
    const joined = middlewareConfig.matcher.join(' ')
    expect(joined.match(/songket/g)?.length).toBe(2)
  })
})

describe('songket gift accounts are encrypted at rest', () => {
  it('uses the Lovebirds account shape, so number + holder encrypt and round-trip', () => {
    const enc: any = encryptConfig(defaultConfig)
    const gift = enc.sections.find((s: any) => s.type === 'weddingGift')
    expect(gift.props.accounts.length).toBeGreaterThan(0)
    for (const acc of gift.props.accounts) {
      expect(acc.accountNumber).toHaveProperty('enc')
      expect(acc.accountHolder).toHaveProperty('enc')
      expect(JSON.stringify(acc)).not.toMatch(/\d{8,}/)
    }
    const dec: any = decryptConfig(enc)
    expect(dec.sections.find((s: any) => s.type === 'weddingGift').props.accounts)
      .toEqual((defaultConfig.sections as any[]).find((s) => s.type === 'weddingGift').props.accounts)
  })
})

describe('songket appearance allowlists', () => {
  it('server palette allowlist matches the template palettes', () => {
    expect([...TEMPLATE_PALETTES.songket]).toEqual(PALETTES.map((p) => p.key))
    expect(isPaletteAllowedForTemplate('songket', 'warmCream')).toBe(false)
  })

  it('server ornament allowlist matches the template ornaments, Lovebirds birds rejected', () => {
    expect(TEMPLATE_ORNAMENTS.songket.map((o) => o.key)).toEqual(ORNAMENTS.map((o) => o.key))
    for (const o of ORNAMENTS) expect(isOrnamentAllowedForTemplate('songket', o.key)).toBe(true)
    expect(isOrnamentAllowedForTemplate('songket', 'birds')).toBe(false)
  })

  it('demo theme uses allowed keys', () => {
    expect(isPaletteAllowedForTemplate('songket', defaultConfig.theme.defaultPalette)).toBe(true)
    expect(isOrnamentAllowedForTemplate('songket', defaultConfig.theme.ornamentType)).toBe(true)
  })
})

describe('songket palettes meet WCAG AA for text', () => {
  const css = readFileSync(new URL('../styles/songket.css', import.meta.url), 'utf8')
  const palettes: Record<string, Record<string, string>> = {}
  for (const m of css.matchAll(/\[data-sk-palette='(\w+)'\]\s*\{([^}]+)\}/g)) {
    palettes[m[1]] = Object.fromEntries([...m[2].matchAll(/--sk-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((v) => [v[1], v[2]]))
  }
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  // Every token pair that carries small text somewhere in the sections.
  const TEXT_PAIRS: Array<[string, string]> = [
    ['text', 'bg'], ['text', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'bg-deep'],
    ['gold-soft', 'bg'], ['gold-soft', 'bg-deep'], ['gold-soft', 'surface'], ['on-gold', 'gold'],
    ['gold', 'bg'], ['gold', 'bg-deep'], ['gold', 'surface'],
  ]

  it('defines every palette the allowlist names', () => {
    expect(Object.keys(palettes).sort()).toEqual(PALETTES.map((p) => p.key).sort())
  })

  it.each(PALETTES.map((p) => p.key))('%s: text pairs ≥ 4.5:1', (key) => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(ratio(palettes[key][fg], palettes[key][bg]), `${key} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
