'use client'

import type React from 'react'
import { useEffect, useState } from 'react'

interface Match { kind: 'guest' | 'rsvp'; id: string; name: string }

export default function CheckinForm({ slug, token }: { slug: string; token: string }) {
  const [q, setQ] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [doneName, setDoneName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (picked || doneName) return
    const term = q.trim()
    if (term.length < 3) { setMatches([]); return }
    setSearching(true)
    const h = setTimeout(async () => {
      try {
        const res = await fetch('/api/checkin/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, token, q: term }),
        })
        const data = await res.json()
        setMatches(Array.isArray(data.matches) ? data.matches : [])
      } catch { setMatches([]) } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(h)
  }, [q, slug, token, picked, doneName])

  async function confirm() {
    if (!picked) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/checkin/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, token, kind: picked.kind, id: picked.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal mencatat kehadiran. Coba lagi.'); setSaving(false); return }
      setDoneName(data.name || picked.name)
    } catch { setError('Gangguan jaringan, coba lagi.'); setSaving(false) }
  }

  if (doneName) {
    return (
      <div style={card}>
        <div style={{ fontSize: 44, marginBottom: 6, color: 'var(--color-emerald)' }}>✓</div>
        <h1 style={h1}>Selamat datang, {doneName}!</h1>
        <p style={p}>Kehadiran Anda sudah tercatat. Terima kasih 🤍</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <h1 style={h1}>Check-in Tamu</h1>
      {!picked ? (
        <>
          <p style={p}>Ketik nama Anda untuk konfirmasi kehadiran.</p>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama lengkap…" style={input} />
          <div style={{ marginTop: 12 }}>
            {q.trim().length < 3 ? null : searching ? (
              <p style={hint}>Mencari…</p>
            ) : matches.length === 0 ? (
              <p style={hint}>Nama tidak ditemukan — silakan ke meja panitia.</p>
            ) : (
              <ul style={list}>
                {matches.map((m) => (
                  <li key={`${m.kind}-${m.id}`}>
                    <button type="button" style={rowBtn} onClick={() => setPicked(m)}>{m.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <p style={{ ...p, fontSize: 18, color: 'var(--text-primary)' }}>Anda <strong>{picked.name}</strong>?</p>
          {error && <p style={{ ...hint, color: 'var(--interactive-primary)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" style={ghostBtn} onClick={() => { setPicked(null); setError(null) }} disabled={saving}>Bukan</button>
            <button type="button" style={primaryBtn} onClick={confirm} disabled={saving}>{saving ? 'Menyimpan…' : 'Ya, saya hadir'}</button>
          </div>
        </>
      )}
    </div>
  )
}

/* Mirrors the dashboard palette (white card on cream, #2A2118 ink, dark pill
   primary button) so the guest-facing check-in feels like the same product. */
const card: React.CSSProperties = { width: 'min(440px, 100%)', background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 28, textAlign: 'center', boxShadow: 'var(--shadow-md)' }
const h1: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 26, margin: '0 0 10px', color: 'var(--text-primary)' }
const p: React.CSSProperties = { color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }
const input: React.CSSProperties = { width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', outline: 'none' }
const hint: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 14, margin: '4px 0' }
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const rowBtn: React.CSSProperties = { width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 'var(--radius-md)', border: '1px solid rgba(42,33,24,0.15)', background: 'var(--surface-raised)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }
const ghostBtn: React.CSSProperties = { flex: 1, padding: '13px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 15 }
const primaryBtn: React.CSSProperties = { flex: 2, padding: '13px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', cursor: 'pointer', fontSize: 15, fontWeight: 600 }
