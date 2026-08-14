import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getLegalDoc } from '@/lib/legal/get'
import { formatRevised } from '@/lib/legal/format'
import { LEGAL_DOC_TYPES, type LegalDocType } from '@/lib/legal/defaults'
import { LANGS, type Lang } from '@/lib/i18n/config'
import LegalEditor, { type LegalDocsState } from './LegalEditor'
import tbl from '@/components/ui/table.module.css'

export const dynamic = 'force-dynamic'

const DOC_LABELS: Record<LegalDocType, string> = {
  terms: 'Syarat & Ketentuan',
  privacy: 'Kebijakan Privasi',
  refund: 'Pengembalian Dana',
}
const LANG_LABELS: Record<Lang, string> = { id: 'ID', en: 'EN' }

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}

/** Audit columns (`updated_at`/`updated_by`) for every existing row, keyed by
 *  "doc:lang". Tolerates the migration not being applied yet — the owner
 *  applies migrations by hand (README SOP), and this page must render a
 *  useful "belum ada" state rather than 500 when the table doesn't exist. */
async function loadAuditColumns(): Promise<Map<string, { updatedAtISO: string | null; updatedBy: string | null }>> {
  const out = new Map<string, { updatedAtISO: string | null; updatedBy: string | null }>()
  try {
    const db = createSupabaseAdminClient()
    const { data, error } = await (db.from('legal_documents') as any).select('doc_type, lang, updated_at, updated_by')
    if (error || !data) return out
    for (const row of data as any[]) {
      out.set(`${row.doc_type}:${row.lang}`, {
        updatedAtISO: row.updated_at ? String(row.updated_at) : null,
        updatedBy: row.updated_by ?? null,
      })
    }
  } catch (err) {
    console.error('[/admin/legal] legal_documents read failed (migration not applied yet?) — showing defaults', err)
  }
  return out
}

export default async function AdminLegalPage() {
  const auditByKey = await loadAuditColumns()

  const docs: LegalDocsState = { terms: {} as any, privacy: {} as any, refund: {} as any }
  for (const doc of LEGAL_DOC_TYPES) {
    for (const lang of LANGS) {
      // getLegalDoc never throws — table-missing / DB-error both fall back to
      // the committed default, same posture as the public pages.
      const legalDoc = await getLegalDoc(doc, lang)
      const audit = auditByKey.get(`${doc}:${lang}`)
      docs[doc][lang] = {
        html: legalDoc.html,
        source: legalDoc.source,
        revisedAtISO: legalDoc.revisedAt,
        updatedAtISO: audit?.updatedAtISO ?? null,
        updatedBy: audit?.updatedBy ?? null,
      }
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Dokumen Legal</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Syarat &amp; Ketentuan, Kebijakan Privasi, dan Kebijakan Pengembalian Dana — per bahasa. Tanpa override, halaman
        publik menampilkan konten bawaan yang sudah ada di repo. Tanggal “terakhir diperbarui” yang tampil ke publik
        hanya bergerak saat kamu menyimpan tanpa mencentang “perbaikan kecil”.
      </p>

      <div className={tbl.tableWrap} style={{ marginBottom: 28 }}>
        <table className={tbl.table}>
          <thead>
            <tr>
              <th>Dokumen</th>
              <th>Bahasa</th>
              <th>Status</th>
              <th>Tanggal publik</th>
              <th>Terakhir diubah</th>
            </tr>
          </thead>
          <tbody>
            {LEGAL_DOC_TYPES.map((doc) =>
              LANGS.map((lang) => {
                const d = docs[doc][lang]
                return (
                  <tr key={`${doc}:${lang}`}>
                    <td data-label="Dokumen">{DOC_LABELS[doc]}</td>
                    <td data-label="Bahasa">{LANG_LABELS[lang]}</td>
                    <td data-label="Status">
                      <span style={{ fontSize: 12, fontWeight: 600, color: d.source === 'db' ? 'var(--status-success-text)' : 'var(--text-secondary)' }}>
                        {d.source === 'db' ? 'Kustom' : 'Bawaan'}
                      </span>
                    </td>
                    <td data-label="Tanggal publik">{formatRevised(d.revisedAtISO, lang)}</td>
                    <td data-label="Terakhir diubah">
                      {d.updatedAtISO ? `${formatDateTime(d.updatedAtISO)}${d.updatedBy ? ` · ${d.updatedBy}` : ''}` : '—'}
                    </td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>

      <LegalEditor initialDocs={docs} />
    </div>
  )
}
