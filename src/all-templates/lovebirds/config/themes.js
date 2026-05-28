/* ============================================================================
   THEMES — named presets that map to CSS custom-property overrides.

   Each theme is a flat object whose keys become CSS variables on the
   section wrapper. So setting `theme: 'darkLuxury'` in pageConfig.js
   applies these variables only to that section.

   Variables consumed by sections (defined in tokens.css):
     --bg            section base background
     --fg            primary text color
     --fg-muted      secondary text color
     --accent        accent color (eyebrows, dots, etc.)
     --accent-soft   softer accent shade
   ============================================================================ */

export const themes = {
  warmCream: {
    '--bg': 'transparent',
    '--fg': 'var(--color-charcoal)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-coral)',
    '--accent-soft': 'var(--color-coral-soft)',
  },

  darkLuxury: {
    '--bg': 'transparent',
    '--fg': 'var(--color-cream)',
    '--fg-muted': 'rgba(253, 246, 236, 0.78)',
    '--accent': 'var(--color-gold)',
    '--accent-soft': 'var(--color-gold-soft)',
  },

  emeraldGarden: {
    '--bg': 'transparent',
    '--fg': 'var(--color-charcoal)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-emerald)',
    '--accent-soft': 'var(--color-emerald-soft)',
  },

  skyEditorial: {
    '--bg': 'transparent',
    '--fg': 'var(--color-charcoal)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-sky)',
    '--accent-soft': 'var(--color-sky-soft)',
  },
}

/**
 * Resolve a theme name → flat CSS variable object that can be spread
 * into a React `style` prop. Falls back to warmCream if unknown.
 */
export function resolveTheme(themeName) {
  return themes[themeName] || themes.warmCream
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
