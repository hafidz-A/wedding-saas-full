import { toCsvRows, type CsvInputRow, type CsvLabels } from './csvRows'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build a standalone, print-ready HTML document for the ledger. Columns mirror
 * the CSV export exactly (via toCsvRows). The caller opens a new window, writes
 * this string, and calls print().
 */
export function buildPrintHtml(
  rows: CsvInputRow[],
  opts: { title: string; souvenirEnabled: boolean; labels: CsvLabels },
): string {
  const records = toCsvRows(rows, { souvenirEnabled: opts.souvenirEnabled, labels: opts.labels })
  const headers = records.length ? Object.keys(records[0]) : [opts.labels.name]
  const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const tbody = records
    .map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`)
    .join('')
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>
<style>
  body { font-family: Georgia, serif; color: #2A2118; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cdbfa6; padding: 6px 10px; text-align: left; }
  th { background: #f0e8d8; }
  @media print { @page { margin: 16mm; } }
</style></head>
<body><h1>${escapeHtml(opts.title)}</h1>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
</body></html>`
}
