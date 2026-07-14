// src/app/admin/payments/ReconcilePanel.tsx
'use client'

import { useState } from 'react'
import {
  adminReconcileGateway, adminRecheckPayment, adminRecheckUpgrade, adminRecheckQuotaAddon,
  type ReconcileMismatch,
} from './actions'

export default function ReconcilePanel() {
  const [busy, setBusy] = useState(false)
  const [ran, setRan] = useState(false)
  const [rows, setRows] = useState<ReconcileMismatch[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  async function reconcile() {
    setBusy(true); setMsg(null)
    const res = await adminReconcileGateway()
    setBusy(false); setRan(true)
    if (!res.ok) { setMsg(res.error || 'Gagal'); return }
    setRows(res.mismatches ?? [])
  }

  async function apply(m: ReconcileMismatch) {
    setBusy(true); setMsg(null)
    const fn = m.type === 'initial' ? adminRecheckPayment : m.type === 'upgrade' ? adminRecheckUpgrade : adminRecheckQuotaAddon
    const res = await fn(m.invitationId)
    setBusy(false)
    if (res.ok && (res as any).applied) { location.reload(); return }
    setMsg(res.error || `Status Xendit: ${(res as any).status ?? '—'} — belum bisa diterapkan`)
  }

  return (
    <section style={{ margin: '18px 0', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 15, margin: 0 }}>Cocokkan dengan Xendit</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Cari pembayaran yang sudah LUNAS di Xendit tapi belum masuk ke sistem (webhook kelewat).
          </p>
        </div>
        <button type="button" disabled={busy} onClick={reconcile} style={btn}>{busy ? 'Mengecek…' : 'Cocokkan sekarang'}</button>
      </div>

      {msg && <p style={{ fontSize: 12, color: 'var(--status-error)', marginTop: 8 }}>{msg}</p>}

      {ran && rows.length === 0 && !msg && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>✓ Cocok semua — tidak ada yang tertinggal.</p>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {rows.map((m, i) => (
            <div key={`${m.type}:${m.invitationId}:${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13 }}>
                <strong>{m.slug}</strong> <span style={{ color: 'var(--text-muted)' }}>· {m.type}</span>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.issue}</div>
              </div>
              {m.canApply
                ? <button type="button" disabled={busy} onClick={() => apply(m)} style={btn}>Terapkan</button>
                : <span style={{ fontSize: 12, color: 'var(--status-error)' }}>Perlu dicek manual</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const btn: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
