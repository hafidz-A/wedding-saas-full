'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'

const TYPES = ['birds', 'butterflies', 'perched'] as const
type OrnamentType = typeof TYPES[number]

const PREVIEW: Record<OrnamentType, string> = {
  birds: `<path class="wing-back" d="M28 33 C29 22, 26 12, 18 6 C15 4, 13 7, 15 13 C13 10, 9 14, 12 21 C10 18, 6 22, 9 29 C7 26, 3 30, 7 37 C5 34, 2 38, 6 42 C12 44, 22 41, 28 33 Z" />
              <path class="bird-body" d="M4 32 L4 38 L20 38 C26 42, 34 43, 40 40 C44 38, 48 35, 58 32 C52 30, 49 28, 46 26 C43 24, 40 25, 36 29 C32 32, 27 33, 22 33 L4 32 Z" />
              <path class="wing-front" d="M30 33 C31 22, 28 10, 20 4 C17 2, 15 5, 17 11 C15 8, 11 12, 14 19 C12 16, 8 20, 11 27 C9 24, 5 28, 9 35 C7 32, 4 36, 8 41 C14 43, 24 41, 30 33 Z" />`,
  butterflies: `<path class="wing-back" d="M30 32 C23 20, 15 13, 9 17 C6 20, 8 28, 15 32 C12 37, 9 46, 12 48 C14 49, 18 43, 22 39 C25 42, 27 41, 28 38 Z" />
              <path class="bird-body" d="M31 32 C33 30, 36 27, 37 27 C38 27, 39 28, 38 29 C37 31, 34 34, 32 34 C31 34, 30 33, 31 32 Z M37 27 C38 26, 39 25, 39 24 C39 23, 38 22, 37 22 C36 22, 35 23, 35 24 C35 25, 36 26, 37 27 Z M31 33 C29 35, 26 39, 22 43 C21 44, 20 44, 21 43 C23 39, 27 35, 30 32 Z M37 23 C41 19, 44 14, 45 13 C46 12, 45 11, 44 12 C41 15, 39 19, 37 23 Z M36 24 Q39 18, 41 12 Q42 11, 41 10 Q40 9, 39 10 Q40 11, 39 12 Q37 18, 35 23 Z M36 24 C39 18, 41 12, 42 11 C43 10, 42 9, 41 10 C39 12, 37 18, 36 24 Z" />
              <path class="wing-front" d="M32 32 C24 16, 15 8, 10 13 C7 16, 12 28, 22 32 C17 38, 12 48, 15 50 C18 52, 24 46, 29 36 C31 38, 32 36, 32 32 Z" />`,
  perched: `<path class="branch-twig" d="M10 44 L54 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="tail-feathers" d="M22 38 L14 48 C13 49 15 50 16 48 L25 40 Z" fill="currentColor" opacity="0.8" />
              <path class="feet" d="M32 38 L30 44 M36 38 L38 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="bird-body" d="M22 32 C22 25, 26 20, 32 20 C38 20, 42 25, 42 32 C42 38, 38 40, 32 40 C26 40, 22 38, 22 32 Z" fill="currentColor" />
              <circle class="bird-head" cx="37" cy="16" r="8" fill="currentColor" />
              <circle cx="39" cy="14" r="1.5" fill="#000" />
              <path class="beak" d="M45 14 L49 16 L45 18 Z" fill="#F5A623" />
              <path class="wing-front" d="M26 30 C26 26, 32 26, 35 32 C38 38, 32 38, 29 36 Z" fill="currentColor" opacity="0.9" />`,
}

export default function OrnamentTab({ slug, initial }: { slug: string; initial?: string }) {
  const t = (useDashboardDict().tabs as any).ornament
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const [type, setType] = useState<OrnamentType>(
    (TYPES as readonly string[]).includes(initial || '') ? (initial as OrnamentType) : 'birds',
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ornamentType: type }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); setMsg({ kind: 'err', text: e.error || t.saveFailed }); fb.fail(fm.saveFail); return }
      setMsg({ kind: 'ok', text: t.savedOk })
      fb.ok(fm.ornamentSaved)
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || t.networkError }); fb.fail(fm.saveFail) }
    finally { setSaving(false) }
  }

  const labels: Record<OrnamentType, string> = { birds: t.birds, butterflies: t.butterflies, perched: t.perched }

  return (
    <div style={card}>
      <header><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></header>
      <div style={grid}>
        {TYPES.map((ty) => (
          <button key={ty} type="button" onClick={() => setType(ty)}
            style={{ ...optBtn, borderColor: type === ty ? '#2A2118' : 'rgba(42,33,24,0.15)', outline: type === ty ? '2px solid #2A2118' : 'none' }}>
            <svg viewBox="0 0 64 64" width="40" height="40" style={{ fill: '#E8553E' }}
                 dangerouslySetInnerHTML={{ __html: PREVIEW[ty] }} />
            <span style={{ fontSize: 13 }}>{labels[ty]}</span>
          </button>
        ))}
      </div>
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" style={btnPrimary} onClick={save} disabled={saving}>{saving ? t.saving : t.save}</button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }
const optBtn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 14px', borderRadius: 12, border: '1px solid', background: '#fff', cursor: 'pointer', color: '#2A2118' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E', marginRight: 'auto' }
