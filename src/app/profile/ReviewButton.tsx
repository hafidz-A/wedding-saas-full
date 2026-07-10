'use client'

import { useState } from 'react'
import { submitReview } from './reviewActions'
import { countWords, MAX_REVIEW_WORDS } from '@/lib/testimonials/validate'

interface Existing { rating: number; body: string; isAnonymous: boolean; isVisible: boolean }

export default function ReviewButton({
  invitationId,
  defaultName,
  existing,
}: {
  invitationId: string
  defaultName: string
  existing: Existing | null
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState(existing?.body ?? '')
  const [name, setName] = useState(defaultName)
  const [anon, setAnon] = useState(existing?.isAnonymous ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const words = countWords(body)
  const over = words > MAX_REVIEW_WORDS
  const invalid = busy || rating === 0 || !body.trim() || over

  async function submit() {
    setBusy(true); setErr(null)
    const res = await submitReview({ invitationId, rating, body, authorName: name, isAnonymous: anon })
    setBusy(false)
    if (res.ok) { setSaved(true); setOpen(false) } else setErr(res.error || 'Gagal')
  }

  const statusChip = existing
    ? (existing.isVisible ? 'Tampil di web' : 'Menunggu ditinjau')
    : null

  if (!open) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={() => setOpen(true)} style={triggerBtn}>
          {existing || saved ? 'Ubah Ulasan' : 'Beri Ulasan'}
        </button>
        {(statusChip || saved) && (
          <span style={chip}>{saved && !existing ? 'Menunggu ditinjau' : statusChip}</span>
        )}
      </span>
    )
  }

  return (
    <div style={scrim} role="dialog" aria-modal="true" onClick={() => !busy && setOpen(false)}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Bagikan pengalamanmu</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          Ceritakan bagaimana undangannya membantu harimu — ulasan yang bagus membantu pasangan lain memutuskan.
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="Rating bintang">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} bintang`}
              style={{ ...starBtn, color: (hover || rating) >= n ? 'var(--color-gold, #E0A400)' : 'var(--border-strong, #ccc)' }}
            >★</button>
          ))}
        </div>

        <label style={lbl}>Ulasan
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Tulis pengalamanmu di sini…"
            style={{ ...ctl, height: 'auto', padding: 10, resize: 'vertical', fontStyle: 'normal' }}
          />
        </label>
        <div style={{ fontSize: 12, color: over ? 'var(--status-error)' : 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
          {words}/{MAX_REVIEW_WORDS} kata
        </div>

        <label style={lbl}>Nama tampil
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={anon} style={{ ...ctl, opacity: anon ? 0.5 : 1 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          Samarkan nama saya (tampil sebagai “Anonim”)
        </label>

        {err && <p style={{ color: 'var(--status-error)', fontSize: 13, margin: '10px 0 0' }}>{err}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" disabled={busy} onClick={() => setOpen(false)} style={ghost}>Batal</button>
          <button type="button" disabled={invalid} onClick={submit} style={{ ...solid, opacity: invalid ? 0.5 : 1 }}>
            {busy ? 'Menyimpan…' : 'Kirim ulasan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const triggerBtn: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }
const chip: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', background: 'var(--border-subtle)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }
const scrim: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const card: React.CSSProperties = { width: '100%', maxWidth: 460, background: '#fff', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(42,33,24,0.20)', padding: 22 }
const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }
const ctl: React.CSSProperties = { height: 44, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', fontStyle: 'normal' }
const starBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 30, lineHeight: 1, cursor: 'pointer', padding: 0 }
const solid: React.CSSProperties = { height: 44, padding: '0 20px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 44, padding: '0 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
