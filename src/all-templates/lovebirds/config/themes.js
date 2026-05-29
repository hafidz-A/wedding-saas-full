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
    '--glass-bg': 'rgba(255, 255, 255, 0.45)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': 'var(--color-charcoal)',
    '--glass-text-muted': 'var(--color-charcoal-light)',
    '--button-bg': 'var(--color-charcoal)',
    '--button-fg': 'var(--color-cream)',
  },

  darkLuxury: {
    '--bg': 'var(--color-charcoal)',
    '--fg': 'var(--color-cream)',
    '--fg-muted': 'rgba(253, 246, 236, 0.78)',
    '--accent': 'var(--color-gold)',
    '--accent-soft': 'var(--color-gold-soft)',
    '--glass-bg': 'rgba(30, 23, 17, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.15)',
    '--glass-text': 'var(--color-cream)',
    '--glass-text-muted': 'rgba(253, 246, 236, 0.78)',
    '--button-bg': 'var(--color-cream)',
    '--button-fg': 'var(--color-charcoal)',
  },

  emeraldGarden: {
    '--bg': 'transparent',
    '--fg': 'var(--color-charcoal)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-emerald)',
    '--accent-soft': 'var(--color-emerald-soft)',
    '--glass-bg': 'rgba(255, 255, 255, 0.45)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': 'var(--color-charcoal)',
    '--glass-text-muted': 'var(--color-charcoal-light)',
    '--button-bg': 'var(--color-charcoal)',
    '--button-fg': 'var(--color-cream)',
  },

  skyEditorial: {
    '--bg': 'transparent',
    '--fg': 'var(--color-charcoal)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-sky)',
    '--accent-soft': 'var(--color-sky-soft)',
    '--glass-bg': 'rgba(255, 255, 255, 0.45)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': 'var(--color-charcoal)',
    '--glass-text-muted': 'var(--color-charcoal-light)',
    '--button-bg': 'var(--color-charcoal)',
    '--button-fg': 'var(--color-cream)',
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
