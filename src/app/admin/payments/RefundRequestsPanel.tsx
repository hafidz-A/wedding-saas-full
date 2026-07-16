// src/app/admin/payments/RefundRequestsPanel.tsx
'use client'

import { useState } from 'react'
import { refundVerdict, type UsageSnapshot } from '@/lib/payments/refund-policy'
import { formatIDR } from '@/lib/payments/transactions'
import { adminApproveRefund, adminRejectRefund } from './actions'
import { canApiRefund } from '@/lib/payments/refund-channels'
import type { RefundRequestView } from './data'
import { useAdminForm } from '@/components/admin/AdminDialogProvider'
import { Button } from '@/components/ui/Button'

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
    const gatewayEligible = r.paidSource === 'midtrans' && canApiRefund(r.paidChannel)
    const res = await formDialog({
      title: `Setujui refund ${formatIDR(r.amountIDR)}`,
      message: gatewayEligible
        ? `Untuk "${r.slug}". Via Midtrans = uang balik otomatis. Manual = kamu transfer balik sendiri.`
        : `Untuk "${r.slug}". Channel ini (${r.paidChannel ?? 'transfer bank/VA'}) tidak mendukung refund otomatis → transfer balik sendiri ke rekening tujuan, lalu catat di sini.`,
      fields: [
        ...(gatewayEligible ? [{ name: 'method', label: 'Cara refund', type: 'select' as const, defaultValue: 'gateway', options: [{ value: 'gateway', label: 'Via Midtrans (otomatis)' }, { value: 'manual', label: 'Manual (transfer sendiri)' }] }] : []),
        { name: 'note', label: 'Catatan (opsional)', type: 'textarea' as const },
      ],
      submitLabel: 'Setujui & refund', tone: 'danger',
    })
    if (!res) return
    const method = (gatewayEligible ? res.method : 'manual') as 'manual' | 'gateway'
    if (method === 'manual' && r.destination && (r.destination.bank || r.destination.account_no)) {
      // Anti-hijack gate (spec §6d): the destination account here was supplied by
      // the CUSTOMER — force the operator to explicitly confirm the account
      // holder's name matches the payer before any manual money moves
      // (mustEqual disables the submit button until 'yes' is picked).
      const confirmed = await formDialog({
        title: 'Konfirmasi sebelum transfer manual',
        message: `Rekening tujuan dari pelanggan: ${r.destination.bank} · ${r.destination.account_no} · a.n. ${r.destination.holder}. Pastikan nama pemilik rekening cocok dengan pembayar "${r.slug}" sebelum lanjut.`,
        fields: [{ name: 'confirmed', label: 'Sudah dicocokkan?', type: 'select', defaultValue: 'no', options: [{ value: 'no', label: 'Belum saya cek' }, { value: 'yes', label: 'Nama pemilik rekening SUDAH saya cocokkan' }], mustEqual: 'yes' }],
        submitLabel: 'Lanjut refund manual', tone: 'danger',
      })
      if (!confirmed) return
    }
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
                <Button size="sm" disabled={busy} onClick={() => approve(r)}>Setujui</Button>
                <Button size="sm" variant="ghostDanger" disabled={busy} onClick={() => reject(r)}>Tolak</Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
