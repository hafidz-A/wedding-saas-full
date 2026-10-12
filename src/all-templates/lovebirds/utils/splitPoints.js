/**
 * Split a schedule description into points: one per line, or per "•" when the
 * couple typed them inline ("• a • b • c"). One point → render a paragraph.
 */
export function splitPoints(text) {
  if (typeof text !== 'string') return []
  return text.split(/\r?\n|•/).map((t) => t.trim()).filter(Boolean)
}
