import { buildCsv } from '@/lib/csv/buildCsv'

/**
 * Return rows without the given columns, preserving the order of the remaining
 * keys. Used to keep internal columns (id, created_at) out of owner-facing CSV
 * exports.
 */
export function omitColumns<T extends Record<string, unknown>>(
  rows: T[],
  keys: string[],
): Record<string, unknown>[] {
  const drop = new Set(keys)
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(row)) {
      if (!drop.has(k)) out[k] = row[k]
    }
    return out
  })
}

/**
 * Client-side CSV download. Delegates serialisation (escaping + formula-
 * injection guard) to buildCsv, prepends a UTF-8 BOM so Excel opens it with
 * the right encoding, and triggers the download. Returns false when there's
 * nothing to export (caller shows a themed alert), true once triggered.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): boolean {
  if (!rows || rows.length === 0) return false
  const blob = new Blob(['﻿', buildCsv(rows)], { type: 'text/csv;charset=utf-8' })
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
