/* Shared colour helpers. */

/**
 * Pick a readable text colour (near-black or white) to sit on top of a solid
 * fill, using the WCAG relative-luminance of the fill. Accepts `#rgb`/`#rrggbb`
 * (with or without the leading `#`); falls back to white for anything it can't
 * parse.
 */
export function readableOn(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.45 ? '#1A1208' : '#FFFFFF'
}
