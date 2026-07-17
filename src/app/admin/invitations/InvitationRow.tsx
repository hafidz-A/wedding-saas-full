// src/app/admin/invitations/InvitationRow.tsx
'use client'

import { useState } from 'react'
import {
  adminComp, adminSetPublished, adminChangePlan, adminAddQuota,
  adminSuspend, adminArchiveInvitation, adminDeleteInvitation,
} from './actions'
import { useAdminConfirm, useAdminForm } from '@/components/admin/AdminDialogProvider'
import { Button } from '@/components/ui/Button'
import ui from '@/components/ui/controls.module.css'

interface Inv {
  id: string; slug: string; templateId: string; plan: string; email: string
  isPublished: boolean; paidSource: string | null; statusLabel: string; quotaExtra: number
  isPaid: boolean; isSuspended: boolean; isArchived: boolean
}

export default function InvitationRow({ inv }: { inv: Inv }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const confirm = useAdminConfirm()
  const formDialog = useAdminForm()

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setMsg(null)
    const res = await fn()
    setBusy(false)
    if (res.ok) { location.reload() } else { setMsg(res.error || 'Gagal') }
  }

  async function onTogglePublish() {
    const ok = inv.isPublished
      ? await confirm({ title: 'Sembunyikan undangan?', message: `"${inv.slug}" tidak akan tayang untuk tamu.`, confirmLabel: 'Sembunyikan', tone: 'danger' })
      : await confirm({ title: 'Terbitkan undangan?', message: `"${inv.slug}" akan tayang untuk publik.`, confirmLabel: 'Terbitkan' })
    if (ok) run(() => adminSetPublished(inv.id, !inv.isPublished))
  }

  async function onComp() {
    const ok = await confirm({ title: 'Gratiskan undangan (comp)?', message: `"${inv.slug}" jadi lunas-gratis (Rp 0) + langsung tayang. Kalau ini uang yang kamu terima offline, pakai "Lunas manual".`, confirmLabel: 'Ya, gratiskan', tone: 'danger' })
    if (ok) run(() => adminComp(inv.id, { source: 'comp', amountIDR: 0, period: { kind: 'plan' } }))
  }

  async function onAddQuota() {
    const ok = await confirm({ title: 'Tambah 50 kuota?', message: `Tambah 50 kuota tamu GRATIS untuk "${inv.slug}".`, confirmLabel: 'Tambah 50' })
    if (ok) run(() => adminAddQuota(inv.id, 50))
  }

  async function onSuspend() {
    if (inv.isSuspended) {
      const ok = await confirm({ title: 'Buka blokir?', message: `"${inv.slug}" bisa tayang & diterbitkan lagi oleh pemiliknya.`, confirmLabel: 'Buka blokir' })
      if (ok) run(() => adminSuspend(inv.id, false))
      return
    }
    const res = await formDialog({
      title: 'Blokir undangan (takedown)',
      message: 'Halaman publik + editor pasangan ikut mati sampai kamu buka blokir lagi.',
      fields: [{ name: 'reason', label: 'Alasan (opsional)', type: 'textarea', placeholder: 'mis. laporan penyalahgunaan' }],
      submitLabel: 'Blokir', tone: 'danger',
    })
    if (!res) return
    run(() => adminSuspend(inv.id, true, res.reason || undefined))
  }

  async function onDelete() {
    const res = await formDialog({
      title: `Hapus undangan "${inv.slug}"`,
      message: 'Permanen dan tidak bisa dibatalkan (foto ikut terhapus). Ketik slug persis untuk konfirmasi.',
      fields: [{ name: 'slug', label: `Ketik "${inv.slug}"`, placeholder: inv.slug, mustEqual: inv.slug }],
      submitLabel: 'Hapus permanen', tone: 'danger',
    })
    if (!res) return
    run(() => adminDeleteInvitation(inv.id, res.slug))
  }

  async function onArchive() {
    const ok = await confirm(inv.isArchived
      ? { title: 'Keluarkan dari arsip?', message: 'Undangan muncul lagi di daftar aktif.', confirmLabel: 'Keluarkan' }
      : { title: 'Arsipkan undangan berbayar?', message: 'Disembunyikan dari daftar, tapi data & riwayat pembayaran tetap disimpan.', confirmLabel: 'Arsipkan' })
    if (!ok) return
    run(() => adminArchiveInvitation(inv.id, !inv.isArchived))
  }

  async function onLunasManual() {
    const res = await formDialog({
      title: 'Tandai lunas (manual)',
      message: 'Untuk uang yang kamu terima offline (transfer/tunai). Ini dihitung sebagai pendapatan.',
      fields: [{ name: 'amount', label: 'Nominal diterima (Rp)', type: 'number', defaultValue: '0', required: true }],
      submitLabel: 'Tandai lunas',
    })
    if (!res) return
    const amount = parseInt(res.amount || '0', 10) || 0
    run(() => adminComp(inv.id, { source: 'manual', amountIDR: amount, period: { kind: 'plan' } }))
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
        <a href={`/${inv.templateId}/${inv.slug}`} target="_blank" rel="noreferrer" className={`${ui.btn} ${ui.sm} ${ui.ghost}`}>Lihat</a>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onTogglePublish}>{inv.isPublished ? 'Sembunyikan' : 'Terbitkan'}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onComp}>Comp (gratis)</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onLunasManual}>Lunas manual</Button>
        <select disabled={busy} value={inv.plan} onChange={async (e) => {
          const next = e.target.value
          if (next === inv.plan) return
          const ok = await confirm({ title: 'Ganti plan?', message: `Ubah plan "${inv.slug}" dari ${inv.plan} → ${next}? Fitur (mis. Buku Tamu Premium) ikut menyesuaikan.`, confirmLabel: 'Ganti' })
          if (ok) run(() => adminChangePlan(inv.id, next))
        }} style={selectCtl}>
          <option value="basic">basic</option><option value="premium">premium</option>
        </select>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onAddQuota}>+50 kuota</Button>
        <Button size="sm" variant={inv.isSuspended ? 'ghost' : 'ghostDanger'} disabled={busy} onClick={onSuspend}>{inv.isSuspended ? 'Buka blokir' : 'Blokir'}</Button>
        {inv.isPaid
          ? <Button size="sm" variant="ghost" disabled={busy} onClick={onArchive}>{inv.isArchived ? 'Keluarkan arsip' : 'Arsipkan'}</Button>
          : <Button size="sm" variant="ghostDanger" disabled={busy} onClick={onDelete}>Hapus</Button>}
      </div>
      {msg && <span style={{ fontSize: 12, color: 'var(--status-error)', width: '100%' }}>{msg}</span>}
    </div>
  )
}

// Still used by the plan <select> below — a <select> isn't a <button>, so it
// can't move to the shared <Button> component (the "Lihat" anchor now uses
// controls.module.css classes directly instead).
const selectCtl: React.CSSProperties = { height: 36, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }

function chip(color: string): React.CSSProperties {
  return { marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}`, color }
}
