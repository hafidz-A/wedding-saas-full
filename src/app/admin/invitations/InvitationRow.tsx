// src/app/admin/invitations/InvitationRow.tsx
'use client'

import { useState } from 'react'
import {
  adminComp, adminSetPublished, adminChangePlan, adminAddQuota,
  adminSuspend, adminArchiveInvitation, adminDeleteInvitation,
} from './actions'

interface Inv {
  id: string; slug: string; templateId: string; plan: string; email: string
  isPublished: boolean; paidSource: string | null; statusLabel: string; quotaExtra: number
  isPaid: boolean; isSuspended: boolean; isArchived: boolean
}

export default function InvitationRow({ inv }: { inv: Inv }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setMsg(null)
    const res = await fn()
    setBusy(false)
    if (res.ok) { location.reload() } else { setMsg(res.error || 'Gagal') }
  }

  function onSuspend() {
    if (inv.isSuspended) { run(() => adminSuspend(inv.id, false)); return }
    const reason = prompt('Blokir undangan ini (takedown — publik + editor pasangan ikut mati). Alasan (opsional):')
    if (reason === null) return // cancelled
    run(() => adminSuspend(inv.id, true, reason || undefined))
  }

  function onDelete() {
    const typed = prompt(`Hapus PERMANEN undangan "${inv.slug}"? Tidak bisa dibatalkan. Ketik slug persis untuk konfirmasi:`)
    if (typed === null) return
    run(() => adminDeleteInvitation(inv.id, typed))
  }

  function onArchive() {
    const ok = confirm(inv.isArchived
      ? 'Keluarkan dari arsip?'
      : 'Arsipkan undangan berbayar ini? Disembunyikan dari daftar, tapi data & riwayat pembayaran tetap disimpan.')
    if (!ok) return
    run(() => adminArchiveInvitation(inv.id, !inv.isArchived))
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', opacity: inv.isArchived ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 500 }}>
          {inv.slug} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {inv.templateId} · {inv.plan}</span>
          {inv.isSuspended && <span style={chip('var(--status-error)')}>diblokir</span>}
          {inv.isArchived && <span style={chip('var(--text-muted)')}>arsip</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inv.email} · {inv.statusLabel}{inv.paidSource ? ` · ${inv.paidSource}` : ''}{inv.quotaExtra ? ` · +${inv.quotaExtra} kuota` : ''}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <a href={`/${inv.templateId}/${inv.slug}`} target="_blank" rel="noreferrer" style={ghost}>Lihat</a>
        <button type="button" disabled={busy} onClick={() => run(() => adminSetPublished(inv.id, !inv.isPublished))} style={ghost}>{inv.isPublished ? 'Sembunyikan' : 'Terbitkan'}</button>
        <button type="button" disabled={busy} onClick={() => run(() => adminComp(inv.id, { source: 'comp', amountIDR: 0, period: { kind: 'plan' } }))} style={ghost}>Comp (gratis)</button>
        <button type="button" disabled={busy} onClick={() => { const a = parseInt(prompt('Nominal diterima (Rp):') || '0', 10) || 0; run(() => adminComp(inv.id, { source: 'manual', amountIDR: a, period: { kind: 'plan' } })) }} style={ghost}>Lunas manual</button>
        <select disabled={busy} defaultValue={inv.plan} onChange={(e) => run(() => adminChangePlan(inv.id, e.target.value))} style={ghost}>
          <option value="basic">basic</option><option value="premium">premium</option>
        </select>
        <button type="button" disabled={busy} onClick={() => run(() => adminAddQuota(inv.id, 50))} style={ghost}>+50 kuota</button>
        <button type="button" disabled={busy} onClick={onSuspend} style={inv.isSuspended ? ghost : warn}>{inv.isSuspended ? 'Buka blokir' : 'Blokir'}</button>
        {inv.isPaid
          ? <button type="button" disabled={busy} onClick={onArchive} style={ghost}>{inv.isArchived ? 'Keluarkan arsip' : 'Arsipkan'}</button>
          : <button type="button" disabled={busy} onClick={onDelete} style={danger}>Hapus</button>}
      </div>
      {msg && <span style={{ fontSize: 12, color: 'var(--status-error)', width: '100%' }}>{msg}</span>}
    </div>
  )
}

const ghost: React.CSSProperties = { height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }
const warn: React.CSSProperties = { ...ghost, borderColor: 'var(--status-error)', color: 'var(--status-error)' }
const danger: React.CSSProperties = { ...ghost, borderColor: 'var(--status-error)', background: 'var(--status-error)', color: '#fff' }

function chip(color: string): React.CSSProperties {
  return { marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}`, color }
}
