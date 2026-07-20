// src/app/[template]/[slug]/dashboard/RefundRequestButton.tsx
'use client'

import { useState } from 'react'
import { requestRefund } from '@/app/onboarding/actions'
import { needsRefundDestination } from '@/lib/payments/refund-channels'
import RefundRequestFields, { EMPTY_REFUND_FORM, buildRefundInput } from '@/components/refund/RefundRequestFields'

/**
 * Owner-facing "Ajukan pengembalian dana". Files a refund REQUEST the operator
 * reviews (never an instant refund). A manual/offline-paid invitation, or a
 * Midtrans channel that doesn't support the Direct Refund API (bank transfer/
 * VA), also collects a destination account.
 */
export default function RefundRequestButton({ invitationId, paidSource, paidChannel, hasPendingRefund = false, eligible = true }: { invitationId: string; paidSource: string; paidChannel: string | null; hasPendingRefund?: boolean; eligible?: boolean }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_REFUND_FORM)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const needsDestination = needsRefundDestination(paidSource, paidChannel)

  async function submit() {
    setBusy(true); setErr(null)
    const res = await requestRefund(invitationId, buildRefundInput(form, needsDestination))
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

  // Already declared not-eligible (sticky "sudah dipakai", or live past the
  // grace window). Hide the self-serve form — offer a contact path instead so a
  // genuine edge case can still reach the operator, but junk requests don't queue.
  if (!eligible) {
    return (
      <div style={wrap}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
          Undangan ini sudah dipakai, jadi <strong>tidak memenuhi syarat pengembalian dana</strong>. Kalau menurutmu ada kekeliruan, hubungi tim FinCards.
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
      <RefundRequestFields value={form} onChange={setForm} needsDestination={needsDestination} />
      {err && <span style={{ fontSize: 12, color: 'var(--status-error)' }}>{err}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={submit} style={solid}>{busy ? 'Mengirim…' : 'Kirim permintaan'}</button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={ghost}>Batal</button>
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = { margin: '0 clamp(16px, 4vw, 40px) 16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--interactive-primary)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }
const solid: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
