// src/app/admin/users/DeletionRequestRow.tsx
'use client'

import { useState } from 'react'
import { adminProcessDeletion, adminRejectDeletion } from './actions'
import { useAdminConfirm, useAdminForm, useAdminAlert } from '@/components/admin/AdminDialogProvider'

interface Req {
  id: string; email: string; reason: string
  requestedAt: string; scheduledFor: string | null; scheduledLabel: string; due: boolean
}

export default function DeletionRequestRow({ req }: { req: Req }) {
  const [busy, setBusy] = useState(false)
  const confirm = useAdminConfirm()
  const formDialog = useAdminForm()
  const alertDialog = useAdminAlert()

  async function process() {
    if (!req.due) {
      await alertDialog({ title: 'Belum bisa diproses', message: `Masih dalam tenggang 7 hari — baru bisa diproses ${req.scheduledLabel}.` })
      return
    }
    const ok = await confirm({
      title: 'Proses penghapusan akun?',
      message: `Data pribadi ${req.email} akan DIHAPUS PERMANEN: undangan berbayar dianonimkan (catatan keuangan disimpan tanpa identitas), draft dihapus total, login dihapus. Tidak bisa dibatalkan.`,
      tone: 'danger', confirmLabel: 'Ya, hapus permanen',
    })
    if (!ok) return
    setBusy(true)
    const res = await adminProcessDeletion(req.id)
    setBusy(false)
    if (res.ok) location.reload(); else await alertDialog({ title: 'Gagal', message: res.error || 'Coba lagi.', tone: 'danger' })
  }

  async function reject() {
    const res = await formDialog({
      title: 'Tolak permintaan hapus',
      message: `Untuk ${req.email}.`,
      fields: [{ name: 'note', label: 'Alasan (opsional)', type: 'textarea' }],
      submitLabel: 'Tolak', tone: 'danger',
    })
    if (!res) return
    setBusy(true)
    const out = await adminRejectDeletion(req.id, res.note || undefined)
    setBusy(false)
    if (out.ok) location.reload(); else await alertDialog({ title: 'Gagal', message: out.error || 'Coba lagi.', tone: 'danger' })
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ minWidth: 220 }}>
        <div style={{ fontWeight: 500 }}>{req.email}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Diajukan {req.requestedAt} · jadwal proses {req.scheduledLabel}{req.due ? '' : ' (masih tenggang)'}{req.reason ? ` · "${req.reason}"` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" disabled={busy} onClick={process} style={danger}>Proses hapus</button>
        <button type="button" disabled={busy} onClick={reject} style={ghost}>Tolak</button>
      </div>
    </div>
  )
}

const danger: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--status-error)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
