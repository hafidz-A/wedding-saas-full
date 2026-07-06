// src/app/admin/payments/PaymentsClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { formatIDR, type Transaction } from '@/lib/payments/transactions'
import { adminExportTransactionsCsv, adminBackfillPaidAmounts } from './actions'

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export default function PaymentsClient({ txns, canBackfill }: { txns: Transaction[]; canBackfill: boolean }) {
  const [type, setType] = useState('all')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => txns.filter((t) =>
    (type === 'all' || t.type === type) &&
    (source === 'all' || t.source === source) &&
    (status === 'all' || t.status === status) &&
    (!q || t.slug.toLowerCase().includes(q.toLowerCase()))
  ), [txns, type, source, status, q])

  async function exportCsv() {
    setBusy(true)
    const res = await adminExportTransactionsCsv()
    setBusy(false)
    if (!res.ok || !res.csv) { alert(res.error || 'Gagal ekspor'); return }
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function backfill() {
    if (!confirm('Isi nominal untuk undangan berbayar lama (yang belum tercatat)?')) return
    setBusy(true)
    const res = await adminBackfillPaidAmounts()
    setBusy(false)
    if (!res.ok) { alert(res.error || 'Gagal'); return }
    alert(`Selesai. Terisi: ${res.updated}, dilewati: ${res.skipped}.`)
    location.reload()
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Transaksi ({rows.length})</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {canBackfill && <button type="button" disabled={busy} onClick={backfill} style={btn}>Isi angka lama</button>}
          <button type="button" disabled={busy} onClick={exportCsv} style={btn}>Ekspor CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <input placeholder="Cari slug…" value={q} onChange={(e) => setQ(e.target.value)} style={ctl} />
        <Select value={type} onChange={setType} options={[['all', 'Semua tipe'], ['initial', 'Awal'], ['upgrade', 'Upgrade'], ['addon', 'Kuota']]} />
        <Select value={source} onChange={setSource} options={[['all', 'Semua sumber'], ['xendit', 'Xendit'], ['manual', 'Manual'], ['comp', 'Comp']]} />
        <Select value={status} onChange={setStatus} options={[['all', 'Semua status'], ['paid', 'Lunas'], ['refunded', 'Direfund']]} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={th}>Slug</th><th style={th}>Tipe</th><th style={th}>Sumber</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Jumlah</th><th style={th}>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ ...td, color: 'var(--text-muted)' }}>Tidak ada transaksi.</td></tr>
            ) : rows.map((t) => (
              <tr key={t.key} style={{ borderTop: '0.5px solid var(--border-default)', opacity: t.status === 'refunded' ? 0.6 : 1 }}>
                <td style={td}><a href={`/admin/invitations?q=${encodeURIComponent(t.slug)}`} style={{ color: 'var(--interactive-primary)' }}>{t.slug}</a></td>
                <td style={td}>{t.type}</td>
                <td style={td}>{t.source}</td>
                <td style={td}>{t.status === 'refunded' ? 'direfund' : 'lunas'}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatIDR(t.amountIDR)}</td>
                <td style={td}>{fmtDate(t.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={ctl}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

const ctl: React.CSSProperties = { height: 34, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 13 }
const btn: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 500 }
const td: React.CSSProperties = { padding: '8px 8px' }
