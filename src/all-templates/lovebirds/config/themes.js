/* Named theme presets — flat CSS-variable objects applied to <body> by ThemeProvider.
 *
 * SINGLE SOURCE OF TRUTH for the Lovebirds palette. Every value below is copied
 * verbatim from `style-guide-lovebirds.html` (the master reference, `themes`
 * object at line ~2096) so the running app is pixel-identical to the guide.
 *
 *   --bg          section background override. `transparent` on light-background
 *                 presets so the global ambient (--page-bg / --bg-image) and
 *                 ornaments show through; a solid colour on dark presets.
 *   --bg-image    the per-theme ambient gradient. applyTheme() paints this onto
 *                 --page-bg so each palette gets its OWN glow (guide: `bgImage`).
 *   --glass-text / --glass-text-muted — project-only vars (not in the guide);
 *                 mirror --fg / --fg-muted so glass cards read correctly.
 *
 * Literal hex (not var(--color-*)) by design: this file IS the palette config,
 * so the values must match the guide exactly with no token indirection drift.
 */

export const themes = {
  warmCream: {
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(50% 38% at 50% 82%, rgba(232, 85, 62, 0.18), transparent 70%),' +
      'radial-gradient(40% 32% at 12% 18%, rgba(245, 200, 66, 0.18), transparent 70%),' +
      'radial-gradient(40% 32% at 88% 16%, rgba(45, 140, 78, 0.11), transparent 70%),' +
      'radial-gradient(38% 28% at 8% 84%, rgba(107, 53, 168, 0.11), transparent 70%),' +
      'radial-gradient(38% 28% at 92% 82%, rgba(61, 155, 193, 0.11), transparent 70%),' +
      'linear-gradient(180deg, #FDF6EC 0%, #F7EBD7 100%)',
    '--fg': '#2A2118',
    '--fg-muted': '#5C4A3A',
    '--accent': '#E8553E',
    '--accent-soft': '#F4A38F',
    '--glass-bg': 'rgba(255, 255, 255, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': '#2A2118',
    '--glass-text-muted': '#5C4A3A',
    '--button-bg': '#E8553E',
    '--button-fg': '#ffffff',
  },

  darkLuxury: {
    '--bg': '#2A2118',
    '--bg-image':
      'radial-gradient(60% 50% at 50% 0%, rgba(245, 200, 66, 0.12), transparent 80%),' +
      'linear-gradient(180deg, #2A2118 0%, #1e1711 100%)',
    '--fg': '#FDF6EC',
    '--fg-muted': 'rgba(253, 246, 236, 0.78)',
    '--accent': '#F5C842',
    '--accent-soft': '#FBE3A6',
    '--glass-bg': 'rgba(30, 23, 17, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.15)',
    '--glass-text': '#FDF6EC',
    '--glass-text-muted': 'rgba(253, 246, 236, 0.78)',
    '--button-bg': '#F5C842',
    '--button-fg': '#2A2118',
  },

  emeraldGarden: {
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(50% 38% at 50% 82%, rgba(45, 140, 78, 0.15), transparent 70%),' +
      'radial-gradient(40% 32% at 12% 18%, rgba(245, 200, 66, 0.12), transparent 70%),' +
      'linear-gradient(180deg, #FDF6EC 0%, #F7EBD7 100%)',
    '--fg': '#2A2118',
    '--fg-muted': '#5C4A3A',
    '--accent': '#2D8C4E',
    '--accent-soft': '#8FCBA1',
    '--glass-bg': 'rgba(255, 255, 255, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': '#2A2118',
    '--glass-text-muted': '#5C4A3A',
    '--button-bg': '#2D8C4E',
    '--button-fg': '#ffffff',
  },

  skyEditorial: {
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(50% 38% at 50% 82%, rgba(61, 155, 193, 0.15), transparent 70%),' +
      'radial-gradient(40% 32% at 12% 18%, rgba(245, 200, 66, 0.12), transparent 70%),' +
      'linear-gradient(180deg, #FDF6EC 0%, #F7EBD7 100%)',
    '--fg': '#2A2118',
    '--fg-muted': '#5C4A3A',
    '--accent': '#3D9BC1',
    '--accent-soft': '#A8D5E3',
    '--glass-bg': 'rgba(255, 255, 255, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.45)',
    '--glass-text': '#2A2118',
    '--glass-text-muted': '#5C4A3A',
    '--button-bg': '#3D9BC1',
    '--button-fg': '#ffffff',
  },

  blossomVelvet: {
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(50% 40% at 50% 80%, rgba(224, 107, 123, 0.22), transparent 70%),' +
      'radial-gradient(40% 30% at 15% 20%, rgba(128, 43, 67, 0.15), transparent 70%),' +
      'linear-gradient(180deg, #FAF0EC 0%, #F2B6C1 100%)',
    '--fg': '#802B43',
    '--fg-muted': '#6B5A5E',
    '--accent': '#E06B7B',
    '--accent-soft': '#F2B6C1',
    '--glass-bg': 'rgba(255, 255, 255, 0.65)',
    '--glass-border': 'rgba(255, 255, 255, 0.5)',
    '--glass-text': '#802B43',
    '--glass-text-muted': '#6B5A5E',
    '--button-bg': '#802B43',
    '--button-fg': '#FAF0EC',
  },

  sunsetClay: {
    '--bg': 'transparent',
    '--bg-image':
      'radial-gradient(50% 40% at 50% 80%, rgba(200, 90, 50, 0.18), transparent 70%),' +
      'radial-gradient(40% 30% at 85% 15%, rgba(110, 130, 104, 0.18), transparent 70%),' +
      'linear-gradient(180deg, #FAF2EA 0%, #EAD0A8 100%)',
    /* fg is a deep clay brown (NOT the terracotta accent) — using #C85A32 as
       body text washed out against the peach-sand bg and clashed with the
       palette name. Terracotta stays as the accent/button signature.
       Accent deepened #C85A32 → #B34E2A (same hue): the old value only hit
       3.82:1 against the cream button-fg/glass (both directions — RSVP
       toggle/submit text, gift CTA, navbar) — below the 4.5:1 small-text AA
       bar. The deeper clay measures 4.69:1 with no visible hue shift. */
    '--fg': '#46281A',
    '--fg-muted': '#5A6B52',
    '--accent': '#B34E2A',
    '--accent-soft': '#EAD0A8',
    '--glass-bg': 'rgba(255, 255, 255, 0.65)',
    '--glass-border': 'rgba(255, 255, 255, 0.5)',
    '--glass-text': '#46281A',
    '--glass-text-muted': '#5A6B52',
    '--button-bg': '#B34E2A',
    '--button-fg': '#FAF2EA',
  },

  midnightStardust: {
    '--bg': '#1E222D',
    '--bg-image':
      'radial-gradient(60% 50% at 50% 0%, rgba(227, 192, 141, 0.12), transparent 80%),' +
      'radial-gradient(40% 40% at 10% 80%, rgba(93, 156, 236, 0.12), transparent 70%),' +
      'linear-gradient(180deg, #1E222D 0%, #11141B 100%)',
    '--fg': '#F5E5C9',
    '--fg-muted': 'rgba(245, 229, 201, 0.75)',
    '--accent': '#E3C08D',
    '--accent-soft': '#5D9CEC',
    '--glass-bg': 'rgba(21, 37, 68, 0.65)',
    '--glass-border': 'rgba(255, 255, 255, 0.12)',
    '--glass-text': '#F5E5C9',
    '--glass-text-muted': 'rgba(245, 229, 201, 0.75)',
    '--button-bg': '#E3C08D',
    '--button-fg': '#1E222D',
  },

  royalPlum: {
    '--bg': '#4A0E1D',
    '--bg-image':
      'radial-gradient(50% 40% at 50% 10%, rgba(245, 200, 66, 0.18), transparent 70%),' +
      'radial-gradient(45% 45% at 85% 85%, rgba(224, 107, 123, 0.25), transparent 70%),' +
      'linear-gradient(180deg, #4A0E1D 0%, #22030B 100%)',
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
    '--bg-image':
      'radial-gradient(50% 45% at 15% 15%, rgba(158, 224, 177, 0.25), transparent 70%),' +
      'radial-gradient(45% 40% at 85% 80%, rgba(245, 200, 66, 0.15), transparent 70%),' +
      'linear-gradient(180deg, #12291B 0%, #06110A 100%)',
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
    '--bg-image':
      'radial-gradient(50% 40% at 80% 20%, rgba(245, 200, 66, 0.22), transparent 70%),' +
      'radial-gradient(45% 45% at 20% 80%, rgba(110, 130, 104, 0.22), transparent 70%),' +
      'linear-gradient(180deg, #8E3A21 0%, #4D1A0D 100%)',
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
