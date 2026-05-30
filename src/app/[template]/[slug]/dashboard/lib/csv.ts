/**
 * Client-side CSV download. Quotes any cell containing ',', '"', or '\n'.
 * Stringifies non-null primitives via String(); null/undefined become ''.
 * Returns false when there's nothing to export (caller shows a themed alert),
 * true once the download is triggered.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): boolean {
  if (!rows || rows.length === 0) {
    return false
  }
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')

  // Prepend UTF-8 BOM so Excel opens it with proper encoding.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
  return true
}
