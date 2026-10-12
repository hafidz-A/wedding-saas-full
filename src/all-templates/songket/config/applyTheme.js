/* Global theme applicator — writes CSS vars onto <body>; paints each theme's
   own ambient (--bg-image) onto --page-bg so every palette gets its own glow. */
import { resolveTheme } from './themes.js'

export const DEFAULT_THEME_NAME = 'merahLak'

/* Display metadata for the picker + dashboard (themes.js holds only CSS vars).
   Swatches are each palette's signature colour. */
export const THEME_META = {
  gadingSongket: { label: 'Gading Songket', group: 'light', swatch: '#7A1626' },
  emasPagi:      { label: 'Emas Pagi',      group: 'light', swatch: '#7A5410' },
  merahJambu:    { label: 'Merah Jambu',    group: 'light', swatch: '#8E2340' },
  hijauPupus:    { label: 'Hijau Pupus',    group: 'light', swatch: '#1F5E40' },
  unguLembut:    { label: 'Ungu Lembut',    group: 'light', swatch: '#5B2D8A' },
  biruMusi:      { label: 'Biru Musi',      group: 'light', swatch: '#1E4E79' },
  jinggaSenja:   { label: 'Jingga Senja',   group: 'light', swatch: '#9A3F12' },
  // Swatch = the palette's cloth colour (every dark palette shares the gold).
  merahLak:      { label: 'Merah Emas',     group: 'dark',  swatch: '#8B1E2D' },
  hijauZamrud:   { label: 'Hijau Zamrud',   group: 'dark',  swatch: '#127A55' },
  unguRoyal:     { label: 'Ungu Royal',     group: 'dark',  swatch: '#5B2D8A' },
  hitamLak:      { label: 'Hitam Lak',      group: 'dark',  swatch: '#2A1D19' },
}

export const THEME_ORDER = Object.keys(THEME_META)

export const THEME_GROUPS = {
  light: THEME_ORDER.filter((k) => THEME_META[k].group === 'light'),
  dark: THEME_ORDER.filter((k) => THEME_META[k].group === 'dark'),
}

export function isThemeName(name) {
  return Object.prototype.hasOwnProperty.call(THEME_META, name)
}

/* Apply the chosen theme to the whole songket route. No-op on the server. */
export function applyTheme(name) {
  const key = isThemeName(name) ? name : DEFAULT_THEME_NAME
  const vars = resolveTheme(key)
  if (typeof document === 'undefined' || !document.body) return key
  const body = document.body
  for (const [k, v] of Object.entries(vars)) body.style.setProperty(k, v)

  // Each theme carries its own ambient gradient (--bg-image, copied from the
  // style guide). Paint it onto --page-bg so the page background matches the
  // palette exactly — no more single shared cream ambient.
  body.style.setProperty('--page-bg', vars['--bg-image'])

  // Paint the root canvas (<html>) with the theme base so iOS overscroll /
  // rubber-band reveals a sliver of matching colour instead of a white gap.
  // The body's ambient uses background-attachment:fixed, which never paints
  // the bounce area — only the html canvas does. Dark presets carry a solid
  // `--bg`; light presets use `transparent`, so fall back to the cream base
  // (the top stop of every light preset's gradient). Cleared by clearTheme().
  const canvasBg = vars['--bg'] && vars['--bg'] !== 'transparent' ? vars['--bg'] : '#F7EEDC'
  document.documentElement.style.backgroundColor = canvasBg

  body.classList.forEach((c) => { if (c.startsWith('theme-')) body.classList.remove(c) })
  body.classList.add(`theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
  return key
}

/* Remove everything applyTheme() painted onto <body>. Called when the
   songket shell unmounts (SPA navigation away) so the theme vars and
   `theme-*` class don't leak onto marketing/dashboard routes. Every theme
   shares the same var keys, so the default theme's keys cover them all. */
export function clearTheme() {
  if (typeof document === 'undefined' || !document.body) return
  const body = document.body
  for (const k of Object.keys(resolveTheme(DEFAULT_THEME_NAME))) {
    body.style.removeProperty(k)
  }
  body.style.removeProperty('--page-bg')
  // Revert the overscroll canvas colour to the global cream base (global.css).
  document.documentElement.style.removeProperty('background-color')
  body.classList.forEach((c) => { if (c.startsWith('theme-')) body.classList.remove(c) })
}
