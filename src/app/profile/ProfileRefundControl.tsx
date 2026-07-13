// src/app/profile/ProfileRefundControl.tsx
'use client'

import { useState } from 'react'
import { requestRefund, type RefundRequestInput } from '@/app/onboarding/actions'

/**
 * Compact per-invitation refund control for the /profile list. Mirrors the
 * dashboard's RefundRequestButton behaviour but fits a row:
 *   - pending  → a small "Refund diproses" chip
 *   - eligible → an "Ajukan refund" pill that opens a modal form
 *   - not eligible → a padlock 🔒 (not clickable) with a small hover tooltip
 * Only rendered for paid, non-comp invitations.
 */
export default function ProfileRefundControl({
  invitationId, paidSource, eligible, hasPending,
}: { invitationId: string; paidSource: string; eligible: boolean; hasPending: boolean }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [category, setCategory] = useState<RefundRequestInput['category']>('duplicate_payment')
  const [detail, setDetail] = useState('')
  const [bank, setBank] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [holder, setHolder] = useState('')
  const needsDestination = paidSource === 'manual'

  async function submit() {
    setBusy(true); setErr(null)
    const destination = needsDestination ? { bank, account_no: accountNo, holder } : undefined
    const res = await requestRefund(invitationId, { category, detail: detail || undefined, destination })
    setBusy(false)
    if (res.ok) { setDone(true); setOpen(false) } else setErr(res.error || 'Gagal')
  }

  if (hasPending || done) {
    return <span style={chip} title="Permintaan pengembalian dana sedang diproses tim FinCards.">⏳ Refund diproses</span>
  }

  if (!eligible) {
    // Padlock — not clickable — with a small hover tooltip near it.
    return (
      <span style={lockWrap} tabIndex={0}>
        <span style={lockBtn} aria-disabled="true" aria-label="Refund tidak tersedia">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Refund
        </span>
        <span style={tip} className="pf-refund-tip" role="tooltip">
          Tidak memenuhi syarat pengembalian dana — undangan sudah dipakai. Kalau menurutmu keliru, hubungi tim FinCards.
        </span>
        <style>{`.pf-refund-tip{opacity:0;visibility:hidden;transition:opacity .12s} span:hover>.pf-refund-tip,span:focus-within>.pf-refund-tip,span:focus>.pf-refund-tip{opacity:1;visibility:visible}`}</style>
      </span>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={pill}>Ajukan refund</button>
      {open && (
        <div style={scrim} role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div style={card} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Ajukan pengembalian dana</strong>
            <p style={{ margin: '6px 0 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Ditinjau operator dulu (bukan refund otomatis). Hanya untuk kasus seperti bayar dobel / gagal sistem / tidak bisa diakses — bukan karena undangan sudah dipakai.
            </p>
            <label style={lbl}>Alasan
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={ctl}>
                <option value="duplicate_payment">Bayar dobel</option>
                <option value="system_failure">Gagal sistem</option>
                <option value="inaccessible">Tidak bisa diakses</option>
                <option value="other">Lainnya</option>
              </select>
            </label>
            <label style={lbl}>Keterangan (opsional)
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} style={{ ...ctl, height: 'auto', padding: 8 }} />
            </label>
            {needsDestination && (
              <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Karena bayar via transfer/manual, isi rekening tujuan:</p>
                <input placeholder="Bank" value={bank} onChange={(e) => setBank(e.target.value)} style={ctl} />
                <input placeholder="Nomor rekening" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} style={ctl} />
                <input placeholder="Nama pemilik rekening" value={holder} onChange={(e) => setHolder(e.target.value)} style={ctl} />
              </div>
            )}
            {err && <span style={{ fontSize: 12, color: 'var(--status-error)' }}>{err}</span>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" disabled={busy} onClick={submit} style={solid}>{busy ? 'Mengirim…' : 'Kirim permintaan'}</button>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} style={ghost}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const pill: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--status-error)', background: 'transparent', color: 'var(--status-error)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }
const chip: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 'var(--radius-pill)', background: 'var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', cursor: 'default' }
const lockWrap: React.CSSProperties = { position: 'relative', display: 'inline-flex', outline: 'none' }
const lockBtn: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1, background: 'transparent' }
const tip: React.CSSProperties = { position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 220, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-charcoal, #2a2118)', color: '#fff', fontSize: 11.5, lineHeight: 1.5, textTransform: 'none', letterSpacing: 0, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', pointerEvents: 'none' }
const scrim: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const card: React.CSSProperties = { width: '100%', maxWidth: 420, background: 'var(--surface-raised, #fff)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 20, textAlign: 'left' }
const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }
const ctl: React.CSSProperties = { height: 38, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-warm, #fff)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const solid: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
