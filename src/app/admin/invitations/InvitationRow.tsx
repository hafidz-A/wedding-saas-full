// src/app/admin/invitations/InvitationRow.tsx
'use client'

import { useState } from 'react'
import { adminComp, adminSetPublished, adminChangePlan, adminAddQuota } from './actions'

interface Inv { id: string; slug: string; templateId: string; plan: string; email: string; isPublished: boolean; paidSource: string | null; statusLabel: string; quotaExtra: number }

export default function InvitationRow({ inv }: { inv: Inv }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setMsg(null)
    const res = await fn()
    setBusy(false)
    if (res.ok) { location.reload() } else { setMsg(res.error || 'Gagal') }
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 500 }}>{inv.slug} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {inv.templateId} · {inv.plan}</span></div>
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
      </div>
      {msg && <span style={{ fontSize: 12, color: 'var(--interactive-primary)', width: '100%' }}>{msg}</span>}
    </div>
  )
}

const ghost: React.CSSProperties = { height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }
