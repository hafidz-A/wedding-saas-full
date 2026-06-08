import { buildCsv } from '@/lib/csv/buildCsv'

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
