/* Global theme applicator — writes CSS vars onto <body>; dark presets also set page bg. */
import { resolveTheme } from './themes.js'

export const DEFAULT_THEME_NAME = 'warmCream'

/* Display metadata for the picker + dashboard (themes.js holds only CSS vars). */
export const THEME_META = {
  warmCream:        { label: 'Warm Cream',        group: 'light', swatch: '#E8553E' },
  emeraldGarden:    { label: 'Emerald Garden',    group: 'light', swatch: '#2D8C4E' },
  skyEditorial:     { label: 'Sky Editorial',     group: 'light', swatch: '#3D9BC1' },
  blossomVelvet:    { label: 'Blossom Velvet',    group: 'light', swatch: '#E06B7B' },
  sunsetClay:       { label: 'Sunset Clay',       group: 'light', swatch: '#C85A32' },
  darkLuxury:       { label: 'Dark Luxury',       group: 'dark',  swatch: '#F5C842' },
  midnightStardust: { label: 'Midnight Stardust', group: 'dark',  swatch: '#E3C08D' },
}

export const THEME_ORDER = Object.keys(THEME_META)

export const THEME_GROUPS = {
  light: THEME_ORDER.filter((k) => THEME_META[k].group === 'light'),
  dark: THEME_ORDER.filter((k) => THEME_META[k].group === 'dark'),
}

export function isThemeName(name) {
  return Object.prototype.hasOwnProperty.call(THEME_META, name)
}

/* Warm cream ambient — the historical default body background (literal hex so
   it works when written via JS onto body.style). */
const CREAM_PAGE =
  'radial-gradient(50% 38% at 50% 82%, rgba(232,85,62,0.18), transparent 70%),' +
  'radial-gradient(40% 32% at 12% 18%, rgba(245,200,66,0.18), transparent 70%),' +
  'radial-gradient(40% 32% at 88% 16%, rgba(45,140,78,0.11), transparent 70%),' +
  'radial-gradient(38% 28% at 8% 84%, rgba(107,53,168,0.11), transparent 70%),' +
  'radial-gradient(38% 28% at 92% 82%, rgba(61,155,193,0.11), transparent 70%),' +
  'linear-gradient(180deg, #FDF6EC 0%, #F7EBD7 100%)'

/* Apply the chosen theme to the whole lovebirds route. No-op on the server. */
export function applyTheme(name) {
  const key = isThemeName(name) ? name : DEFAULT_THEME_NAME
  const vars = resolveTheme(key)
  if (typeof document === 'undefined' || !document.body) return key
  const body = document.body
  for (const [k, v] of Object.entries(vars)) body.style.setProperty(k, v)

  // Dark presets declare a solid --bg; use it as the page background. Light
  // presets (--bg: transparent) keep the warm cream ambient.
  const bg = vars['--bg'] && vars['--bg'] !== 'transparent' ? vars['--bg'] : CREAM_PAGE
  body.style.setProperty('--page-bg', bg)

  body.classList.forEach((c) => { if (c.startsWith('theme-')) body.classList.remove(c) })
  body.classList.add(`theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
  return key
}
