/* Named theme presets — flat CSS-variable objects applied to <body> by ThemeProvider. */

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

  blossomVelvet: {
    '--bg': 'transparent',
    '--fg': 'var(--color-plum)',
    '--fg-muted': 'var(--color-charcoal-light)',
    '--accent': 'var(--color-rose)',
    '--accent-soft': 'var(--color-rose-soft)',
    '--glass-bg': 'rgba(255, 255, 255, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': 'var(--color-plum)',
    '--glass-text-muted': 'var(--color-charcoal-light)',
    '--button-bg': 'var(--color-plum)',
    '--button-fg': 'var(--color-mauve-cream)',
  },

  sunsetClay: {
    '--bg': 'transparent',
    '--fg': 'var(--color-terracotta)',
    '--fg-muted': 'var(--color-sage)',
    '--accent': 'var(--color-terracotta)',
    '--accent-soft': 'var(--color-gold-sand)',
    '--glass-bg': 'rgba(255, 255, 255, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': 'var(--color-terracotta)',
    '--glass-text-muted': 'var(--color-sage)',
    '--button-bg': 'var(--color-terracotta)',
    '--button-fg': 'var(--color-peach-sand)',
  },

  midnightStardust: {
    '--bg': 'var(--color-midnight)',
    '--fg': 'var(--color-champagne-soft)',
    '--fg-muted': 'rgba(245, 229, 201, 0.75)',
    '--accent': 'var(--color-champagne)',
    '--accent-soft': 'var(--color-celestial)',
    '--glass-bg': 'rgba(21, 37, 68, 0.65)',
    '--glass-border': 'rgba(255, 255, 255, 0.15)',
    '--glass-text': 'var(--color-champagne-soft)',
    '--glass-text-muted': 'rgba(245, 229, 201, 0.75)',
    '--button-bg': 'var(--color-champagne)',
    '--button-fg': 'var(--color-midnight)',
  },

  royalPlum: {
    '--bg': '#4A0E1D',
    '--fg': '#FAF0EC',
    '--fg-muted': '#F2B6C1',
    '--accent': '#F5C842',
    '--accent-soft': '#E06B7B',
    '--glass-bg': 'rgba(74, 14, 29, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#FAF0EC',
    '--glass-text-muted': '#F2B6C1',
    '--button-bg': '#F5C842',
    '--button-fg': '#4A0E1D',
  },

  forestMist: {
    '--bg': '#12291B',
    '--fg': '#EAF0E9',
    '--fg-muted': '#A4B29E',
    '--accent': '#9EE0B1',
    '--accent-soft': '#2D8C4E',
    '--glass-bg': 'rgba(18, 41, 27, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#EAF0E9',
    '--glass-text-muted': '#A4B29E',
    '--button-bg': '#9EE0B1',
    '--button-fg': '#12291B',
  },

  terracottaOasis: {
    '--bg': '#8E3A21',
    '--fg': '#FAF2EA',
    '--fg-muted': '#EAD0A8',
    '--accent': '#FBE3A6',
    '--accent-soft': '#FAF2EA',
    '--glass-bg': 'rgba(142, 58, 33, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#FAF2EA',
    '--glass-text-muted': '#EAD0A8',
    '--button-bg': '#FBE3A6',
    '--button-fg': '#8E3A21',
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
