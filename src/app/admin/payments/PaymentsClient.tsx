// src/app/admin/payments/PaymentsClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatIDR, type Transaction } from '@/lib/payments/transactions'
import { adminExportTransactionsCsv, adminBackfillPaidAmounts, adminRefund, adminRefundViaGateway } from './actions'
import type { RefundSourceType } from '@/lib/payments/refunds'
import { canApiRefund } from '@/lib/payments/refund-channels'
import { useAdminConfirm, useAdminAlert, useAdminForm } from '@/components/admin/AdminDialogProvider'
import { Button } from '@/components/ui/Button'
import { useFeedback } from '@/components/ui/FeedbackProvider'
import ui from '@/components/ui/controls.module.css'

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
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const confirm = useAdminConfirm()
  const alertDialog = useAdminAlert()
  const formDialog = useAdminForm()
  const fb = useFeedback()
  const router = useRouter()

  const rows = useMemo(() => txns.filter((t) => {
    const d = t.date ? t.date.slice(0, 10) : ''
    return (type === 'all' || t.type === type) &&
      (source === 'all' || t.source === source) &&
      (status === 'all' || t.status === status) &&
      (!q || t.slug.toLowerCase().includes(q.toLowerCase())) &&
      (!from || (d && d >= from)) &&
      (!to || (d && d <= to))
  }), [txns, type, source, status, q, from, to])

  // Reset to the first page whenever the filters change.
  useEffect(() => { setPage(0) }, [type, source, status, q, from, to])
  const PAGE_SIZE = 50
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paged = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  async function exportCsv() {
    setBusy(true)
    const res = await adminExportTransactionsCsv()
    setBusy(false)
    if (!res.ok || !res.csv) { await alertDialog({ title: 'Gagal ekspor', message: res.error || 'Coba lagi.', tone: 'danger' }); return }
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function refund(t: Transaction) {
    const sourceType = t.type as RefundSourceType
    const sourceId = t.key.split(':').slice(1).join(':')
    // Only channels the Midtrans Refund API actually supports (credit_card,
    // gopay, shopeepay, dana, ovo, qris, kredivo, akulaku) can go the automatic
    // route — VA/bank_transfer/cstore always fail server-side, so don't offer it.
    const gatewayEligible = t.source === 'midtrans' && canApiRefund(t.paidChannel)
    const res = await formDialog({
      title: `Refund ${formatIDR(t.amountIDR)}`,
      message: gatewayEligible
        ? `Untuk "${t.slug}". Via Midtrans = uang balik otomatis ke metode asal. Manual = kamu transfer balik sendiri lalu catat di sini.`
        : t.source === 'midtrans'
          ? `Untuk "${t.slug}". Channel ini (${t.paidChannel ?? 'transfer bank/VA'}) tidak mendukung refund otomatis → transfer balik sendiri ke rekening tujuan, lalu catat di sini.`
          : `Untuk "${t.slug}". Dibayar offline → kamu transfer balik sendiri dulu, lalu catat di sini.`,
      fields: [
        ...(gatewayEligible ? [{ name: 'method', label: 'Cara refund', type: 'select' as const, defaultValue: 'gateway', options: [{ value: 'gateway', label: 'Via Midtrans (otomatis)' }, { value: 'manual', label: 'Manual (transfer sendiri)' }] }] : []),
        { name: 'reason', label: 'Alasan (opsional)', type: 'textarea' as const, placeholder: 'mis. bayar dobel' },
      ],
      submitLabel: 'Proses refund', tone: 'danger',
    })
    if (!res) return
    const method = (gatewayEligible ? res.method : 'manual') as 'gateway' | 'manual'
    if (method === 'manual') {
      // Anti-hijack gate: force the operator to explicitly confirm they matched
      // the destination account's holder name before any manual money moves
      // (mustEqual disables the submit button until 'yes' is picked).
      const confirmed = await formDialog({
        title: 'Konfirmasi sebelum transfer manual',
        message: `Pastikan kamu sudah mencocokkan nama pemilik rekening tujuan untuk "${t.slug}" sebelum lanjut.`,
        fields: [{ name: 'confirmed', label: 'Sudah dicocokkan?', type: 'select', defaultValue: 'no', options: [{ value: 'no', label: 'Belum saya cek' }, { value: 'yes', label: 'Nama pemilik rekening SUDAH saya cocokkan' }], mustEqual: 'yes' }],
        submitLabel: 'Lanjut refund manual', tone: 'danger',
      })
      if (!confirmed) return
    }
    setBusy(true)
    const r = method === 'gateway'
      ? await adminRefundViaGateway(sourceType, sourceId, res.reason || undefined)
      : await adminRefund(sourceType, sourceId, res.reason || undefined)
    setBusy(false)
    if (r.ok) { fb.ok('Refund diproses'); router.refresh() } else { await alertDialog({ title: 'Refund gagal', message: r.error || 'Coba lagi.', tone: 'danger' }) }
  }

  async function backfill() {
    const ok = await confirm({ title: 'Isi angka lama', message: 'Isi nominal untuk undangan berbayar lama yang belum tercatat angkanya?', confirmLabel: 'Isi sekarang' })
    if (!ok) return
    setBusy(true)
    const res = await adminBackfillPaidAmounts()
    setBusy(false)
    if (!res.ok) { await alertDialog({ title: 'Gagal', message: res.error || 'Coba lagi.', tone: 'danger' }); return }
    fb.ok(`Terisi: ${res.updated}, dilewati: ${res.skipped}`)
    router.refresh()
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Transaksi ({rows.length})</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {canBackfill && <Button size="sm" variant="ghost" disabled={busy} onClick={backfill}>Isi angka lama</Button>}
          <Button size="sm" variant="ghost" disabled={busy} onClick={exportCsv}>Ekspor CSV</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <input placeholder="Cari slug…" value={q} onChange={(e) => setQ(e.target.value)} className={ui.input} style={{ flex: '1 1 160px', minWidth: 0 }} />
        <Select value={type} onChange={setType} options={[['all', 'Semua tipe'], ['initial', 'Awal'], ['upgrade', 'Upgrade'], ['addon', 'Kuota']]} />
        <Select value={source} onChange={setSource} options={[['all', 'Semua sumber'], ['midtrans', 'Midtrans'], ['manual', 'Manual'], ['comp', 'Comp']]} />
        <Select value={status} onChange={setStatus} options={[['all', 'Semua status'], ['paid', 'Lunas'], ['refunded', 'Direfund']]} />
        <input type="date" title="Dari tanggal" value={from} onChange={(e) => setFrom(e.target.value)} className={ui.input} style={{ width: 144, flex: '0 0 auto' }} />
        <input type="date" title="Sampai tanggal" value={to} onChange={(e) => setTo(e.target.value)} className={ui.input} style={{ width: 144, flex: '0 0 auto' }} />
        {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo('') }}>Reset tgl</Button>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={th}>Slug</th><th style={th}>Tipe</th><th style={th}>Sumber</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Jumlah</th><th style={th}>Tanggal</th><th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, color: 'var(--text-muted)' }}>Tidak ada transaksi.</td></tr>
            ) : paged.map((t) => (
              <tr key={t.key} style={{ borderTop: '0.5px solid var(--border-default)', opacity: t.status === 'refunded' ? 0.6 : 1 }}>
                <td style={td}><a href={`/admin/invitations?q=${encodeURIComponent(t.slug)}`} style={{ color: 'var(--interactive-primary)' }}>{t.slug}</a></td>
                <td style={td}>{t.type}</td>
                <td style={td}>{t.source}</td>
                <td style={td}>{t.status === 'refunded' ? 'direfund' : 'lunas'}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatIDR(t.amountIDR)}</td>
                <td style={td}>{fmtDate(t.date)}</td>
                <td style={td}>
                  {t.status === 'paid' && t.source !== 'comp'
                    ? <Button size="sm" variant="ghostDanger" disabled={busy} onClick={() => refund(t)}>Refund</Button>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          <Button size="sm" variant="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Sebelumnya</Button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Halaman {safePage + 1} / {pageCount}</span>
          <Button size="sm" variant="ghost" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Berikutnya →</Button>
        </div>
      )}
    </section>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={ui.input} style={{ width: 150, flex: '0 0 auto' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 500 }
const td: React.CSSProperties = { padding: '8px 8px' }
