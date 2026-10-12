import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { defaultConfig } from '../defaultConfig.js'
import { sectionRegistry } from '../registry.js'
import { sectionRegistry as lovebirdsRegistry } from '../../lovebirds/registry.js'
import { themes } from '../config/themes.js'
import { THEME_META, DEFAULT_THEME_NAME } from '../config/applyTheme.js'
import { SHAPES } from '../components/Ornaments.jsx'
import { encryptConfig, decryptConfig } from '@/lib/crypto/config'
import { TEMPLATE_PALETTES, isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'
import { TEMPLATE_ORNAMENTS, isOrnamentAllowedForTemplate } from '@/lib/templates/appearance'
import { getSchemaRegistry } from '@/editor/schemas'
import { getTemplatePolicy } from '@/editor/templatePolicy'
import { isValidTemplate } from '@/config/templateIndex'
import { templateCatalog } from '@/config/templateCatalog'
import { config as middlewareConfig } from '@/middleware'

/* Songket is a Lovebirds fork (same sections + editor contract, adat visuals).
   These pin what the fork must keep in sync with the server-side allowlists,
   plus the two failure modes that are silent in production: an unencrypted
   bank account and an unreadable palette. */

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

const sections = defaultConfig.sections as Array<{ type: string; props: any }>

describe('songket wiring', () => {
  it('every demo section has a renderer and an editor schema', () => {
    const schemas = getSchemaRegistry('songket')
    for (const { type } of sections) {
      expect(sectionRegistry, type).toHaveProperty(type)
      expect(schemas[type], `schema for ${type}`).toBeDefined()
    }
  })

  it('shares the Lovebirds editor contract (it is a fork)', () => {
    expect(getSchemaRegistry('songket')).toBe(getSchemaRegistry('lovebirds'))
    expect(getTemplatePolicy('songket')).toBe(getTemplatePolicy('lovebirds'))
    expect(Object.keys(sectionRegistry).sort()).toEqual(
      Object.keys(lovebirdsRegistry).sort(),
    )
  })

  it('renders at /songket/<slug> but is not in the sellable catalog yet (uji coba)', () => {
    expect(isValidTemplate('songket')).toBe(true)
    expect(templateCatalog.map((t: { id: string }) => t.id)).not.toContain('songket')
  })

  it('middleware covers the public page and the dashboard', () => {
    expect(middlewareConfig.matcher.join(' ').match(/songket/g)?.length).toBe(2)
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
      .toEqual(sections.find((s) => s.type === 'weddingGift')!.props.accounts)
  })
})

describe('songket appearance allowlists', () => {
  it('server palette allowlist = the palettes the template defines', () => {
    expect([...TEMPLATE_PALETTES.songket].sort()).toEqual(Object.keys(themes).sort())
    expect(Object.keys(THEME_META).sort()).toEqual(Object.keys(themes).sort())
    expect(isPaletteAllowedForTemplate('songket', 'warmCream')).toBe(false)
  })

  it('server ornament allowlist = the ornaments the template draws; Lovebirds birds rejected', () => {
    expect(TEMPLATE_ORNAMENTS.songket.map((o) => o.key).sort()).toEqual(Object.keys(SHAPES).sort())
    expect(isOrnamentAllowedForTemplate('songket', 'birds')).toBe(false)
  })

  it('demo theme uses allowed keys', () => {
    expect(isPaletteAllowedForTemplate('songket', defaultConfig.theme.defaultPalette)).toBe(true)
    expect(isOrnamentAllowedForTemplate('songket', defaultConfig.theme.ornamentType)).toBe(true)
    expect(themes).toHaveProperty(DEFAULT_THEME_NAME)
  })
})

describe('songket palettes meet WCAG AA for text', () => {
  const hex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
  const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it.each(Object.keys(themes))('%s: text, muted text, accent and buttons ≥ 4.5:1', (key) => {
    const t = (themes as Record<string, Record<string, string>>)[key]
    // The surface text actually sits on: the solid --bg, or (light palette)
    // the band colour, the darkest stop text sits over.
    const surface = hex(t['--bg']) ? t['--bg'] : t['--band']
    const pairs: Array<[string, string, string]> = [
      ['--fg', t['--fg'], surface],
      ['--fg-muted', t['--fg-muted'], surface],
      ['--accent', t['--accent'], surface],
      ['--fg on band', t['--fg'], t['--band']],
      ['--button-fg', t['--button-fg'], t['--button-bg']],
    ]
    for (const [name, fg, bg] of pairs) {
      expect(ratio(fg, bg), `${key} ${name}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('songket motif tiles', () => {
  // Static assets carry no content hash (CLAUDE.md gotcha 11b), so a changed
  // tile gets a new -vN name; this catches a CSS reference left on a name that
  // no longer exists (a silent blank motif, not a 404 anyone would notice).
  it('every motif tile the theme references exists in public/', () => {
    const css = readFileSync(new URL('../styles/theme.css', import.meta.url), 'utf8')
    const refs = [...new Set([...css.matchAll(/url\('(\/songket\/motifs\/[^']+)'\)/g)].map((m) => m[1]))]
    expect(refs.length).toBeGreaterThanOrEqual(4)
    for (const ref of refs) {
      expect(existsSync(new URL(`../../../../public${ref}`, import.meta.url)), ref).toBe(true)
    }
  })
})
