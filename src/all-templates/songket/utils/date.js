/* Date helpers pinned to WIB so server and client render identical text. */

const TZ = 'Asia/Jakarta'

/** Parse a stored date; a value without an offset is read as WIB. */
export function parseWeddingDate(value) {
  if (!value || typeof value !== 'string') return null
  const hasOffset = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const iso = hasOffset || !value.includes('T') ? value : `${value}+07:00`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "Minggu, 15 November 2026" */
export function formatLongDate(value) {
  const d = parseWeddingDate(value)
  if (!d) return ''
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
}
