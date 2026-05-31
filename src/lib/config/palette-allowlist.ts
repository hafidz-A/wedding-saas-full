/** Allowed theme/palette keys per template. Used by the theme API to validate
 *  owner theme saves. Keep in sync with each template's theme definitions
 *  (solary: config/themeTokens.js PALETTES; lovebirds: config/themes.js). */
export const TEMPLATE_PALETTES: Record<string, readonly string[]> = {
  solary: [
    'cosmicDark', 'nebulaDark', 'roseDark', 'emeraldDark',
    'lavenderLight', 'sunburstLight', 'roseLight', 'botanicalLight',
  ],
  lovebirds: [
    'warmCream', 'emeraldGarden', 'skyEditorial', 'blossomVelvet',
    'sunsetClay', 'darkLuxury', 'midnightStardust',
  ],
}

const UNION = new Set(Object.values(TEMPLATE_PALETTES).flat())

/** True if `palette` is valid for the given template. When `template` is
 *  null/unknown, accept any palette known to ANY template (lenient fallback). */
export function isPaletteAllowedForTemplate(
  template: string | null | undefined,
  palette: string,
): boolean {
  if (template && TEMPLATE_PALETTES[template]) {
    return TEMPLATE_PALETTES[template].includes(palette)
  }
  return UNION.has(palette)
}
