// src/app/admin/payments/RefundRequestsPanel.tsx
'use client'

import { useState } from 'react'
import { refundVerdict, type UsageSnapshot } from '@/lib/payments/refund-policy'
import { formatIDR } from '@/lib/payments/transactions'
import { adminApproveRefund, adminRejectRefund } from './actions'
import type { RefundRequestView } from './data'
import { useAdminForm } from '@/components/admin/AdminDialogProvider'

const CATEGORY: Record<string, string> = {
  duplicate_payment: 'Bayar dobel', system_failure: 'Gagal sistem', inaccessible: 'Tidak bisa diakses', other: 'Lainnya',
}

function normalize(s: any): UsageSnapshot {
  return {
    is_published: !!s?.is_published,
    guest_count: Number(s?.guest_count ?? 0), rsvp_count: Number(s?.rsvp_count ?? 0),
    attendance_count: Number(s?.attendance_count ?? 0),
    config_edited: !!s?.config_edited, days_since_paid: Number(s?.days_since_paid ?? 0),
    ever_used: !!s?.ever_used,
    days_since_published: s?.days_since_published == null ? null : Number(s.days_since_published),
  }
}

export default function RefundRequestsPanel({ requests }: { requests: RefundRequestView[] }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const formDialog = useAdminForm()
  if (!requests.length) return null

  async function approve(r: RefundRequestView) {
    const isXendit = r.paidSource === 'xendit'
    const res = await formDialog({
      title: `Setujui refund ${formatIDR(r.amountIDR)}`,
      message: isXendit
        ? `Untuk "${r.slug}". Via Xendit = uang balik otomatis. Manual = kamu transfer balik sendiri.`
        : `Untuk "${r.slug}". Bayar offline → pastikan kamu (akan) transfer balik ke pelanggan.`,
      fields: [
        ...(isXendit ? [{ name: 'method', label: 'Cara refund', type: 'select' as const, defaultValue: 'xendit', options: [{ value: 'xendit', label: 'Via Xendit (otomatis)' }, { value: 'manual', label: 'Manual (transfer sendiri)' }] }] : []),
        { name: 'note', label: 'Catatan (opsional)', type: 'textarea' as const },
      ],
      submitLabel: 'Setujui & refund', tone: 'danger',
    })
    if (!res) return
    const method = (isXendit ? res.method : 'manual') as 'manual' | 'xendit'
    setBusy(true); setMsg(null)
    const out = await adminApproveRefund(r.id, { method, note: res.note || undefined })
    setBusy(false)
    if (out.ok) location.reload(); else setMsg(out.error || 'Gagal')
  }

  async function reject(r: RefundRequestView) {
    const res = await formDialog({
      title: 'Tolak permintaan refund',
      message: `Untuk "${r.slug}". Pasangan akan lihat statusnya jadi ditolak.`,
      fields: [{ name: 'note', label: 'Alasan tolak (opsional)', type: 'textarea' as const }],
      submitLabel: 'Tolak', tone: 'danger',
    })
    if (!res) return
    setBusy(true); setMsg(null)
    const out = await adminRejectRefund(r.id, res.note || undefined)
    setBusy(false)
    if (out.ok) location.reload(); else setMsg(out.error || 'Gagal')
  }

  return (
    <section style={{ margin: '18px 0', border: '1px solid var(--status-error)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Permintaan refund ({requests.length})</h2>
      {msg && <p style={{ fontSize: 12, color: 'var(--status-error)', margin: '0 0 8px' }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requests.map((r) => {
          const v = refundVerdict(normalize(r.snapshot))
          const s = normalize(r.snapshot)
          return (
            <div key={r.id} style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {r.slug} · {formatIDR(r.amountIDR)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· bayar via {r.paidSource}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Alasan: {CATEGORY[r.category] ?? r.category}{r.detail ? ` — ${r.detail}` : ''}
                </div>
                {r.destination && (r.destination.bank || r.destination.account_no) && (
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>
                    💳 Transfer ke: <strong>{r.destination.bank}</strong> · {r.destination.account_no} · a.n. {r.destination.holder}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Pakai: {s.is_published ? 'tayang' : 'belum tayang'} · {s.guest_count} tamu · {s.rsvp_count} RSVP · {s.attendance_count} check-in · {s.days_since_paid} hari sejak bayar
                  {s.ever_used ? ' · ⚠ pernah dipakai (sticky)' : ''}
                </div>
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${v.eligible ? 'var(--color-emerald, #2e7d32)' : 'var(--status-error)'}`, color: v.eligible ? 'var(--color-emerald, #2e7d32)' : 'var(--status-error)' }}>
                  {v.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" disabled={busy} onClick={() => approve(r)} style={solid}>Setujui</button>
                <button type="button" disabled={busy} onClick={() => reject(r)} style={ghost}>Tolak</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const solid: React.CSSProperties = { height: 32, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 32, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
