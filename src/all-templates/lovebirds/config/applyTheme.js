/* Global theme applicator — writes CSS vars onto <body>; paints each theme's
   own ambient (--bg-image) onto --page-bg so every palette gets its own glow. */
import { resolveTheme } from './themes.js'

export const DEFAULT_THEME_NAME = 'warmCream'

/* Display metadata for the picker + dashboard (themes.js holds only CSS vars).
   Order + grouping mirrors the PaletteTab dashboard and the style guide's
   colour-dot console. Swatches are each theme's signature accent. */
export const THEME_META = {
  warmCream:        { label: 'Warm Cream',        group: 'light', swatch: '#E8553E' },
  emeraldGarden:    { label: 'Emerald Garden',    group: 'light', swatch: '#2D8C4E' },
  skyEditorial:     { label: 'Sky Editorial',     group: 'light', swatch: '#3D9BC1' },
  blossomVelvet:    { label: 'Blossom Velvet',    group: 'light', swatch: '#E06B7B' },
  sunsetClay:       { label: 'Sunset Clay',       group: 'light', swatch: '#C85A32' },
  terracottaOasis:  { label: 'Terracotta Oasis',  group: 'light', swatch: '#FBE3A6' },
  darkLuxury:       { label: 'Dark Luxury',       group: 'dark',  swatch: '#F5C842' },
  midnightStardust: { label: 'Midnight Stardust', group: 'dark',  swatch: '#E3C08D' },
  royalPlum:        { label: 'Royal Plum',        group: 'dark',  swatch: '#F5C842' },
  forestMist:       { label: 'Forest Mist',       group: 'dark',  swatch: '#9EE0B1' },
}

export const THEME_ORDER = Object.keys(THEME_META)

export const THEME_GROUPS = {
  light: THEME_ORDER.filter((k) => THEME_META[k].group === 'light'),
  dark: THEME_ORDER.filter((k) => THEME_META[k].group === 'dark'),
}

export function isThemeName(name) {
  return Object.prototype.hasOwnProperty.call(THEME_META, name)
}

/* Apply the chosen theme to the whole lovebirds route. No-op on the server. */
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

  body.classList.forEach((c) => { if (c.startsWith('theme-')) body.classList.remove(c) })
  body.classList.add(`theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
  return key
}

/* Remove everything applyTheme() painted onto <body>. Called when the
   lovebirds shell unmounts (SPA navigation away) so the theme vars and
   `theme-*` class don't leak onto marketing/dashboard routes. Every theme
   shares the same var keys, so the default theme's keys cover them all. */
export function clearTheme() {
  if (typeof document === 'undefined' || !document.body) return
  const body = document.body
  for (const k of Object.keys(resolveTheme(DEFAULT_THEME_NAME))) {
    body.style.removeProperty(k)
  }
  body.style.removeProperty('--page-bg')
  body.classList.forEach((c) => { if (c.startsWith('theme-')) body.classList.remove(c) })
}
