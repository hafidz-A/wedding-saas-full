/**
 * Derive a couple monogram ("Amara & Rizky" → "A & R") from the couple's
 * DISPLAY name, so the Hero gate, the Couple cards and the Footer all show the
 * same initials in the same order — driven by whatever order the couple chose
 * for their name. Falls back to the explicit bride/groom names (bride first),
 * then to a provided fallback string.
 *
 * Single source of truth so the monograms can never drift out of sync again.
 */
export function deriveMonogram(coupleName, { brideName, groomName } = {}, fallback = 'A & R') {
  const parts = String(coupleName || '')
    .split(/\s*(?:&|\+|\band\b|\bdan\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
    return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase()
  }
  const b = String(brideName || '').trim()[0]
  const g = String(groomName || '').trim()[0]
  if (b && g) return `${b} & ${g}`.toUpperCase()
  return fallback
}
