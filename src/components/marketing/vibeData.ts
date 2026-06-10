/* ============================================================================
   vibeData.ts — normalises the REAL palettes shipped by each template into a
   single client-safe shape the marketing "Vibe Explorer" can render.

   Source of truth (no hardcoded duplication — we import the live configs):
     • Lovebirds → src/all-templates/lovebirds/config/themes.js (+ THEME_META)
     • Solary    → src/all-templates/solary/config/themeTokens.js (PALETTES)

   Each palette carries the exact background, accent, foreground and surface so
   the section background can morph to match whatever the running template
   would actually look like with that palette selected.
   ============================================================================ */
import { themes } from '@/all-templates/lovebirds/config/themes.js'
import { THEME_META, THEME_ORDER } from '@/all-templates/lovebirds/config/applyTheme.js'
import { PALETTES } from '@/all-templates/solary/config/themeTokens.js'

export type VibeMode = 'light' | 'dark'
export type TemplateId = 'lovebirds' | 'solary'

export interface PaletteVibe {
  key: string
  label: string
  mode: VibeMode
  /** Full CSS background applied to the section (gradient string). */
  background: string
  accent: string
  fg: string
  fgMuted: string
  /** Glass / card surface for the preview mockup. */
  surface: string
  surfaceBorder: string
  /** 3 representative dots for the "ambience" row. */
  swatches: string[]
}

export interface TemplateVibe {
  id: TemplateId
  label: string
  demoSlug: string
  /** Invitation category this template belongs to (see config/categories.js). */
  category: string
  palettes: PaletteVibe[]
}

/* ---------- Lovebirds ---------- */
const lovebirdsPalettes: PaletteVibe[] = THEME_ORDER.map((key: string) => {
  const v = themes[key] as Record<string, string>
  const meta = THEME_META[key] as { label: string; group: VibeMode }
  return {
    key,
    label: meta.label,
    mode: meta.group,
    background: v['--bg-image'],
    accent: v['--accent'],
    fg: v['--glass-text'] ?? v['--fg'],
    fgMuted: v['--glass-text-muted'] ?? v['--fg-muted'],
    surface: v['--glass-bg'],
    surfaceBorder: v['--glass-border'],
    swatches: [v['--accent'], v['--accent-soft'], v['--fg']],
  }
})

/* ---------- Solary ---------- */
const SOLARY_ORDER = [
  'lavenderLight',
  'sunburstLight',
  'roseLight',
  'botanicalLight',
  'cosmicDark',
  'nebulaDark',
  'roseDark',
  'emeraldDark',
]

const solaryPalettes: PaletteVibe[] = SOLARY_ORDER.map((key) => {
  const p = PALETTES[key] as Record<string, string>
  const isDark = p.mode === 'dark'
  // Re-create the planetary backdrop: an accent glow at top, deep gradient base.
  const background = isDark
    ? `radial-gradient(60% 45% at 50% 0%, rgba(${p.accentRGB.replace(/ /g, ', ')}, 0.18), transparent 70%),` +
      `radial-gradient(45% 40% at 85% 90%, rgba(${p.accentRGB.replace(/ /g, ', ')}, 0.10), transparent 70%),` +
      `linear-gradient(180deg, ${p.bg} 0%, ${p.bgSoft} 100%)`
    : `radial-gradient(55% 42% at 50% 0%, rgba(${p.accentRGB.replace(/ /g, ', ')}, 0.22), transparent 72%),` +
      `radial-gradient(45% 40% at 88% 88%, rgba(${p.accentRGB.replace(/ /g, ', ')}, 0.12), transparent 70%),` +
      `linear-gradient(180deg, ${p.bg} 0%, ${p.bgSoft} 100%)`
  return {
    key,
    label: p.label,
    mode: p.mode as VibeMode,
    background,
    accent: p.accent,
    fg: p.fg,
    fgMuted: p.fgMute,
    surface: p.surface,
    surfaceBorder: p.line,
    swatches: [p.accent, p.sun, p.fg],
  }
})

export const TEMPLATE_VIBES: TemplateVibe[] = [
  { id: 'lovebirds', label: 'Lovebirds', demoSlug: 'demo-lovebirds', category: 'wedding', palettes: lovebirdsPalettes },
  { id: 'solary', label: 'Solary', demoSlug: 'demo-solary', category: 'wedding', palettes: solaryPalettes },
]
