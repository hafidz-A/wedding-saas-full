/* Songket palettes — adat Palembang. Same CSS-variable contract as the
 * Lovebirds palettes this template was forked from (applied to <body> by
 * ThemeProvider → applyTheme), so every section re-themes unchanged:
 *
 *   --bg          solid section background on dark presets; `transparent` on
 *                 the light preset so the ambient (--page-bg) shows through.
 *   --bg-image    the palette's own ambient gradient (painted onto --page-bg).
 *   --band        a solid band colour for full-width sections that must not
 *                 be transparent (e.g. the verse band) — replaces Lovebirds'
 *                 per-theme hex rows in Quote.module.css.
 *   --glass-*     the "lak" cards: tinted glass with a gold hairline.
 *   --thread      the gold-thread gradient every songket motif is painted with
 *                 (motif tiles are CSS masks, see styles/theme.css).
 *   --fabric-opacity  strength of the lepus cloth texture behind the page.
 *
 * Keys must match src/lib/config/palette-allowlist.ts (songket).
 * Text pairs are pinned ≥ 4.5:1 by __tests__/songket.test.ts.
 */

export const themes = {
  merahLak: {
    '--thread': 'linear-gradient(180deg, #F4E1A1 0%, #D4AF37 50%, #9C7A1E 100%)',
    '--fabric-opacity': '0.09',
    '--bg': '#5E1020',
    '--bg-image':
      'radial-gradient(60% 45% at 50% 0%, rgba(212, 175, 55, 0.18), transparent 75%),' +
      'radial-gradient(45% 40% at 12% 88%, rgba(212, 175, 55, 0.08), transparent 70%),' +
      'linear-gradient(180deg, #6A1426 0%, #3F0A15 100%)',
    '--band': '#4A0C17',
    '--fg': '#F6EBD3',
    '--fg-muted': '#E6D3B1',
    '--accent': '#D4AF37',
    '--accent-soft': '#ECD27E',
    '--glass-bg': 'rgba(63, 10, 21, 0.58)',
    '--glass-border': 'rgba(212, 175, 55, 0.38)',
    '--glass-text': '#F6EBD3',
    '--glass-text-muted': '#E6D3B1',
    '--button-bg': '#D4AF37',
    '--button-fg': '#2A1408',
  },

  hitamLak: {
    '--thread': 'linear-gradient(180deg, #F4E1A1 0%, #D4AF37 50%, #9C7A1E 100%)',
    '--fabric-opacity': '0.09',
    '--bg': '#17100E',
    '--bg-image':
      'radial-gradient(60% 45% at 50% 0%, rgba(212, 175, 55, 0.14), transparent 75%),' +
      'radial-gradient(45% 40% at 88% 85%, rgba(139, 30, 45, 0.22), transparent 70%),' +
      'linear-gradient(180deg, #1D1411 0%, #0D0908 100%)',
    '--band': '#0D0908',
    '--fg': '#F3E7CF',
    '--fg-muted': '#D3C2A3',
    '--accent': '#D4AF37',
    '--accent-soft': '#ECD27E',
    '--glass-bg': 'rgba(37, 26, 23, 0.6)',
    '--glass-border': 'rgba(212, 175, 55, 0.32)',
    '--glass-text': '#F3E7CF',
    '--glass-text-muted': '#D3C2A3',
    '--button-bg': '#D4AF37',
    '--button-fg': '#1A1210',
  },

  gadingSongket: {
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.13',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(122, 22, 38, 0.10), transparent 70%),' +
      'linear-gradient(180deg, #F7EEDC 0%, #EAD9B6 100%)',
    '--band': '#F1E4C8',
    '--fg': '#2A1A12',
    '--fg-muted': '#5C4433',
    '--accent': '#7A1626',
    '--accent-soft': '#B8912A',
    '--glass-bg': 'rgba(255, 250, 240, 0.62)',
    '--glass-border': 'rgba(122, 22, 38, 0.24)',
    '--glass-text': '#2A1A12',
    '--glass-text-muted': '#5C4433',
    '--button-bg': '#7A1626',
    '--button-fg': '#FBF4E4',
  },

  hijauLimas: {
    '--thread': 'linear-gradient(180deg, #F4E1A1 0%, #D4AF37 50%, #9C7A1E 100%)',
    '--fabric-opacity': '0.09',
    '--bg': '#1F3B2D',
    '--bg-image':
      'radial-gradient(60% 45% at 50% 0%, rgba(212, 175, 55, 0.16), transparent 75%),' +
      'radial-gradient(45% 40% at 10% 88%, rgba(110, 20, 35, 0.18), transparent 70%),' +
      'linear-gradient(180deg, #23432F 0%, #142A1F 100%)',
    '--band': '#142A1F',
    '--fg': '#F3EAD3',
    '--fg-muted': '#D6CBAD',
    '--accent': '#D4AF37',
    '--accent-soft': '#ECD27E',
    '--glass-bg': 'rgba(20, 42, 31, 0.58)',
    '--glass-border': 'rgba(212, 175, 55, 0.34)',
    '--glass-text': '#F3EAD3',
    '--glass-text-muted': '#D6CBAD',
    '--button-bg': '#D4AF37',
    '--button-fg': '#1A1210',
  },
}

/** Resolve a theme name → flat CSS variable object (falls back to merahLak). */
export function resolveTheme(themeName) {
  return themes[themeName] || themes.merahLak
}

/**
 * Resolve a `background: { type, value }` config → a CSS string for
 * the `background` property. Falls back to undefined (no override).
 */
export function resolveBackground(bg) {
  if (!bg) return undefined
  switch (bg.type) {
    case 'solid':
    case 'gradient':
      return bg.value
    case 'image':
      return `url(${bg.value}) center / cover no-repeat`
    default:
      return bg.value
  }
}

export default themes
