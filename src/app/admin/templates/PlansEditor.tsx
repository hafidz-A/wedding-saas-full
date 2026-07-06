// src/app/admin/templates/PlansEditor.tsx
'use client'

import { useState } from 'react'
import { updatePlan } from './actions'
import type { PlanPatch } from './validate'
import { formatIDR } from '@/lib/payments/quota'

interface PlanInit extends PlanPatch { plan_code: string }

export default function PlansEditor({ templateId, plan }: { templateId: string; plan: PlanInit }) {
  const [displayName, setDisplayName] = useState(plan.display_name)
  const [price, setPrice] = useState(String(plan.price_idr))
  const [compareAt, setCompareAt] = useState(plan.compare_at_price_idr == null ? '' : String(plan.compare_at_price_idr))
  const [quota, setQuota] = useState(String(plan.base_guest_quota))
  const [duration, setDuration] = useState(plan.duration_days == null ? '' : String(plan.duration_days))
  const [features, setFeatures] = useState(plan.features.join('\n'))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setBusy(true); setMsg(null)
    const patch: PlanPatch = {
      display_name: displayName,
      price_idr: parseInt(price.replace(/\D/g, ''), 10) || 0,
      compare_at_price_idr: compareAt.trim() === '' ? null : (parseInt(compareAt.replace(/\D/g, ''), 10) || 0),
      base_guest_quota: parseInt(quota.replace(/\D/g, ''), 10) || 0,
      duration_days: duration.trim() === '' ? null : (parseInt(duration.replace(/\D/g, ''), 10) || 0),
      features: features.split('\n').map((f) => f.trim()).filter(Boolean),
    }
    const res = await updatePlan(templateId, plan.plan_code, patch)
    setBusy(false)
    setMsg(res.ok ? { ok: true, text: 'Tersimpan ✓' } : { ok: false, text: res.error || 'Gagal' })
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 16, width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong style={{ textTransform: 'capitalize' }}>{plan.plan_code}</strong>
      <Field label="Nama paket"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inp} /></Field>
      <Field label="Harga (Rp)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label={`Harga coret (opsional) — ${compareAt ? formatIDR(Number(compareAt.replace(/\D/g, '')) || 0) : 'kosong'}`}>
        <input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} inputMode="numeric" placeholder="kosongkan jika tak ada" style={inp} />
      </Field>
      <Field label="Kuota tamu (kelipatan 50)"><input value={quota} onChange={(e) => setQuota(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label="Masa aktif (hari, kosong = seumur hidup)"><input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label="Fitur (satu per baris)"><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} /></Field>
      <button type="button" onClick={save} disabled={busy} style={btn}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--color-emerald)' : 'var(--interactive-primary)' }}>{msg.text}</span>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

const inp: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const btn: React.CSSProperties = { height: 40, borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }
