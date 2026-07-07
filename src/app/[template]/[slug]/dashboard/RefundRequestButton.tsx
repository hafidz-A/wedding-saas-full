// src/app/[template]/[slug]/dashboard/RefundRequestButton.tsx
'use client'

import { useState } from 'react'
import { requestRefund, type RefundRequestInput } from '@/app/onboarding/actions'

/**
 * Owner-facing "Ajukan pengembalian dana". Files a refund REQUEST the operator
 * reviews (never an instant refund). A manual/offline-paid invitation also
 * collects a destination account (Xendit returns to the original method).
 */
export default function RefundRequestButton({ invitationId, paidSource, hasPendingRefund = false }: { invitationId: string; paidSource: string; hasPendingRefund?: boolean }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<RefundRequestInput['category']>('duplicate_payment')
  const [detail, setDetail] = useState('')
  const [bank, setBank] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [holder, setHolder] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const needsDestination = paidSource === 'manual'

  async function submit() {
    setBusy(true); setErr(null)
    const destination = needsDestination ? { bank, account_no: accountNo, holder } : undefined
    const res = await requestRefund(invitationId, { category, detail: detail || undefined, destination })
    setBusy(false)
    if (res.ok) setDone(true); else setErr(res.error || 'Gagal')
  }

  // Pending from the server (survives refresh → no duplicate request) OR just
  // submitted. Shows status + the "editing forfeits your refund" warning.
  if (hasPendingRefund || done) {
    return (
      <div style={{ ...wrap, display: 'grid', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
          ✓ Permintaan pengembalian dana <strong>sedang diproses</strong>. Tim FinCards akan meninjau & mengabari kamu.
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--status-error-dark, var(--status-error))' }}>
          ⚠ Selama menunggu keputusan, <strong>jangan mengubah undangan atau menambah tamu</strong> — kalau undangan sudah dipakai, refund bisa ditolak.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div style={wrap}>
        <button type="button" onClick={() => setOpen(true)} style={linkBtn}>Ajukan pengembalian dana</button>
      </div>
    )
  }

  return (
    <div style={{ ...wrap, display: 'grid', gap: 10 }}>
      <strong style={{ fontSize: 14 }}>Ajukan pengembalian dana</strong>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
        Permintaan ini ditinjau operator dulu (bukan refund otomatis). Refund hanya untuk kasus seperti bayar dobel / gagal sistem / tidak bisa diakses — bukan karena undangan sudah dipakai.
      </p>
      <label style={lbl}>Alasan
        <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={ctl}>
          <option value="duplicate_payment">Bayar dobel</option>
          <option value="system_failure">Gagal sistem</option>
          <option value="inaccessible">Tidak bisa diakses</option>
          <option value="other">Lainnya</option>
        </select>
      </label>
      <label style={lbl}>Keterangan (opsional)
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} style={{ ...ctl, height: 'auto', padding: 8 }} />
      </label>
      {needsDestination && (
        <div style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Karena kamu bayar via transfer/manual, isi rekening tujuan pengembalian:</p>
          <input placeholder="Bank" value={bank} onChange={(e) => setBank(e.target.value)} style={ctl} />
          <input placeholder="Nomor rekening" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} style={ctl} />
          <input placeholder="Nama pemilik rekening" value={holder} onChange={(e) => setHolder(e.target.value)} style={ctl} />
        </div>
      )}
      {err && <span style={{ fontSize: 12, color: 'var(--status-error)' }}>{err}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={submit} style={solid}>{busy ? 'Mengirim…' : 'Kirim permintaan'}</button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={ghost}>Batal</button>
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = { margin: '0 clamp(16px, 4vw, 40px) 16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }
const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }
const ctl: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--interactive-primary)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }
const solid: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
