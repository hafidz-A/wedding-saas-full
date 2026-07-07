// src/app/profile/AccountDataSection.tsx
'use client'

import { useState } from 'react'
import { exportMyData, requestAccountDeletion, cancelAccountDeletion } from './actions'

export default function AccountDataSection({ pending }: { pending: { scheduledFor: string | null } | null }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')

  async function download() {
    setBusy(true); setMsg(null)
    const res = await exportMyData()
    setBusy(false)
    if (!res.ok || !res.json) { setMsg(res.error || 'Gagal'); return }
    const blob = new Blob([res.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `data-akun-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function submitDeletion() {
    setBusy(true); setMsg(null)
    const res = await requestAccountDeletion(reason || undefined)
    setBusy(false)
    if (res.ok) location.reload(); else setMsg(res.error || 'Gagal')
  }

  async function cancel() {
    setBusy(true); setMsg(null)
    const res = await cancelAccountDeletion()
    setBusy(false)
    if (res.ok) location.reload(); else setMsg(res.error || 'Gagal')
  }

  const fmt = (iso: string | null) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return iso }
  }

  return (
    <section style={card}>
      <p style={label}>Data &amp; Akun</p>

      <div style={{ marginTop: 10 }}>
        <button type="button" disabled={busy} onClick={download} style={ghost}>Unduh data saya (.json)</button>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
          Salinan semua datamu (undangan, tamu, RSVP, dll) dalam satu file.
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '18px 0' }} />

      {pending ? (
        <div>
          <p style={{ fontSize: 14, margin: 0 }}>
            ⏳ Permintaan <strong>hapus akun</strong> sedang berjalan. Dijadwalkan diproses pada <strong>{fmt(pending.scheduledFor)}</strong> (tenggang 7 hari — kamu masih bisa membatalkannya).
          </p>
          <button type="button" disabled={busy} onClick={cancel} style={{ ...ghost, marginTop: 10 }}>Batalkan permintaan hapus</button>
        </div>
      ) : confirming ? (
        <div style={{ border: '1px solid var(--status-error)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--status-error)' }}>Ajukan penghapusan akun</p>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.6 }}>
            Data pribadimu (nama, foto, daftar tamu, email) akan <strong>dihapus</strong>. Undangan yang sudah dibayar disimpan sebagai catatan keuangan tanpa identitas. Ada <strong>tenggang 7 hari</strong> — kamu bisa membatalkan sebelum diproses.
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Alasan (opsional)" style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={submitDeletion} style={danger}>Ya, ajukan hapus</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} style={ghost}>Batal</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} style={dangerGhost}>Ajukan hapus akun…</button>
      )}

      {msg && <p style={{ fontSize: 12.5, color: 'var(--status-error)', marginTop: 8 }}>{msg}</p>}
    </section>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.94)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: '0 20px 60px rgba(42,33,24,0.10)', marginTop: 24 }
const label: React.CSSProperties = { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)', margin: 0 }
const ghost: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
const dangerGhost: React.CSSProperties = { ...ghost, borderColor: 'var(--status-error)', color: 'var(--status-error)' }
const danger: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--status-error)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
