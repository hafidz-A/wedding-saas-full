// Cells beginning with any of these can be executed as a formula by Excel /
// Sheets. Prefix a single quote to neutralise (CSV-injection guard).
const INJECTION_PREFIX = /^[=+\-@\t\r]/

export function csvEscapeCell(value: unknown): string {
  if (value == null) return ''
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (INJECTION_PREFIX.test(s)) s = "'" + s
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Serialise rows to a CSV string (no BOM — the caller adds it). Header line is
 * the keys of the first row. Every cell is escaped + injection-guarded.
 */
export function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.map(csvEscapeCell).join(','),
    ...rows.map((r) => headers.map((h) => csvEscapeCell(r[h])).join(',')),
  ].join('\n')
}
