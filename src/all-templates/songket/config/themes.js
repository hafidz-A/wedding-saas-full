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
 *   --limar       the ikat colour of the Limar motif set (a counter-colour to the cloth).
 *
 * Keys must match src/lib/config/palette-allowlist.ts (songket).
 * Text pairs are pinned ≥ 4.5:1 by __tests__/songket.test.ts.
 */

export const themes = {
  // Merah emas — the classic red-and-gold songket.
  merahLak: {
    '--limar': '#2F7A57',
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
    '--limar': '#8B1E2D',
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
    '--limar': '#2F6B4A',
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

  // Hijau zamrud — emerald songket with gold thread.
  hijauZamrud: {
    '--limar': '#B8323F',
    '--thread': 'linear-gradient(180deg, #F4E1A1 0%, #D4AF37 50%, #9C7A1E 100%)',
    '--fabric-opacity': '0.09',
    '--bg': '#0E4A35',
    '--bg-image':
      'radial-gradient(60% 45% at 50% 0%, rgba(212, 175, 55, 0.18), transparent 75%),' +
      'radial-gradient(45% 40% at 10% 88%, rgba(20, 110, 78, 0.35), transparent 70%),' +
      'linear-gradient(180deg, #125C42 0%, #08301F 100%)',
    '--band': '#0A3A29',
    '--fg': '#F3EAD3',
    '--fg-muted': '#D8D9C2',
    '--accent': '#D4AF37',
    '--accent-soft': '#ECD27E',
    '--glass-bg': 'rgba(8, 48, 31, 0.58)',
    '--glass-border': 'rgba(212, 175, 55, 0.34)',
    '--glass-text': '#F3EAD3',
    '--glass-text-muted': '#D8D9C2',
    '--button-bg': '#D4AF37',
    '--button-fg': '#0A2A1C',
  },

  // Ungu royal — the royal purple songket with gold thread.
  unguRoyal: {
    '--limar': '#C2477A',
    '--thread': 'linear-gradient(180deg, #F4E1A1 0%, #D4AF37 50%, #9C7A1E 100%)',
    '--fabric-opacity': '0.1',
    '--bg': '#3B1D5A',
    '--bg-image':
      'radial-gradient(60% 45% at 50% 0%, rgba(212, 175, 55, 0.18), transparent 75%),' +
      'radial-gradient(45% 40% at 88% 85%, rgba(120, 60, 160, 0.30), transparent 70%),' +
      'linear-gradient(180deg, #4A2470 0%, #24103A 100%)',
    '--band': '#2C1545',
    '--fg': '#F4EBDD',
    '--fg-muted': '#DCCFE6',
    '--accent': '#D4AF37',
    '--accent-soft': '#ECD27E',
    '--glass-bg': 'rgba(36, 16, 58, 0.58)',
    '--glass-border': 'rgba(212, 175, 55, 0.34)',
    '--glass-text': '#F4EBDD',
    '--glass-text-muted': '#DCCFE6',
    '--button-bg': '#D4AF37',
    '--button-fg': '#24103A',
  },

  // Emas Pagi (terang) — krem keemasan + coklat emas tua; gold thread on a light cloth.
  emasPagi: {
    '--limar': '#7A1626',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(201, 162, 39, 0.22), transparent 70%),' +
      'linear-gradient(180deg, #FBF3DF 0%, #F1E0B8 100%)',
    '--band': '#F6EACB',
    '--fg': '#2E2010',
    '--fg-muted': '#5E4A2C',
    '--accent': '#7A5410',
    '--accent-soft': '#C9A227',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(122, 84, 16, 0.24)',
    '--glass-text': '#2E2010',
    '--glass-text-muted': '#5E4A2C',
    '--button-bg': '#7A5410',
    '--button-fg': '#FFF8E8',
  },

  // Merah Jambu (terang) — merah muda lembut + merah anggur; gold thread on a light cloth.
  merahJambu: {
    '--limar': '#2F6B4A',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(142, 35, 64, 0.14), transparent 70%),' +
      'linear-gradient(180deg, #FBEDEC 0%, #F2D3D3 100%)',
    '--band': '#F7E1E0',
    '--fg': '#3A1A1F',
    '--fg-muted': '#6B3E45',
    '--accent': '#8E2340',
    '--accent-soft': '#C9A227',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(142, 35, 64, 0.24)',
    '--glass-text': '#3A1A1F',
    '--glass-text-muted': '#6B3E45',
    '--button-bg': '#8E2340',
    '--button-fg': '#FFF5F6',
  },

  // Hijau Pupus (terang) — hijau daun muda + hijau tua; gold thread on a light cloth.
  hijauPupus: {
    '--limar': '#8E2340',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(31, 94, 64, 0.14), transparent 70%),' +
      'linear-gradient(180deg, #EEF4EA 0%, #D9E6D2 100%)',
    '--band': '#E4EEDD',
    '--fg': '#1C2E22',
    '--fg-muted': '#3F5545',
    '--accent': '#1F5E40',
    '--accent-soft': '#B8912A',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(31, 94, 64, 0.24)',
    '--glass-text': '#1C2E22',
    '--glass-text-muted': '#3F5545',
    '--button-bg': '#1F5E40',
    '--button-fg': '#F4FAF2',
  },

  // Ungu Lembut (terang) — lavender + ungu royal; gold thread on a light cloth.
  unguLembut: {
    '--limar': '#C2477A',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(91, 45, 138, 0.14), transparent 70%),' +
      'linear-gradient(180deg, #F3EEF8 0%, #E2D6EE 100%)',
    '--band': '#EBE2F3',
    '--fg': '#2A1A3A',
    '--fg-muted': '#54426A',
    '--accent': '#5B2D8A',
    '--accent-soft': '#B8912A',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(91, 45, 138, 0.24)',
    '--glass-text': '#2A1A3A',
    '--glass-text-muted': '#54426A',
    '--button-bg': '#5B2D8A',
    '--button-fg': '#FAF6FF',
  },

  // Biru Musi (terang) — biru muda + biru tua; gold thread on a light cloth.
  biruMusi: {
    '--limar': '#B8323F',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(30, 78, 121, 0.14), transparent 70%),' +
      'linear-gradient(180deg, #EDF3F8 0%, #D5E3EE 100%)',
    '--band': '#E2ECF4',
    '--fg': '#14273A',
    '--fg-muted': '#3A5068',
    '--accent': '#1E4E79',
    '--accent-soft': '#B8912A',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(30, 78, 121, 0.24)',
    '--glass-text': '#14273A',
    '--glass-text-muted': '#3A5068',
    '--button-bg': '#1E4E79',
    '--button-fg': '#F3F8FC',
  },

  // Jingga Senja (terang) — peach + jingga bata; gold thread on a light cloth.
  jinggaSenja: {
    '--limar': '#1F5E40',
    '--thread': 'linear-gradient(180deg, #D9B860 0%, #B8912A 55%, #7A5A10 100%)',
    '--fabric-opacity': '0.14',
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(55% 40% at 50% 0%, rgba(201, 162, 39, 0.20), transparent 75%),' +
      'radial-gradient(45% 40% at 90% 88%, rgba(154, 63, 18, 0.14), transparent 70%),' +
      'linear-gradient(180deg, #FCF0E6 0%, #F5D9C2 100%)',
    '--band': '#F9E6D5',
    '--fg': '#35200F',
    '--fg-muted': '#6A4528',
    '--accent': '#9A3F12',
    '--accent-soft': '#C9A227',
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(154, 63, 18, 0.24)',
    '--glass-text': '#35200F',
    '--glass-text-muted': '#6A4528',
    '--button-bg': '#9A3F12',
    '--button-fg': '#FFF6EE',
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
