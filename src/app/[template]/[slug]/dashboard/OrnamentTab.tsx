'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import { broadcastEditorSave } from '@/editor/lib/editorSync'
import { TEMPLATE_VIBES, type PaletteVibe } from '@/components/marketing/vibeData'
import {
  type OrnamentType,
  ORNAMENT_PREVIEW_PATHS as PREVIEW,
  OrnamentPreviewScene as PreviewScene,
  OrnamentPreviewStyle,
} from '@/components/appearance/OrnamentPreview'
import ctrl from './dashboardControls.module.css'

const TYPES = ['birds', 'butterflies', 'perched'] as const satisfies readonly OrnamentType[]

export default function OrnamentTab({
  slug,
  initial,
  palette,
  onSaved,
}: {
  slug: string
  initial?: string
  palette?: string
  onSaved?: (savedAt: string) => void
}) {
  const t = (useDashboardDict().tabs as any).ornament
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const [type, setType] = useState<OrnamentType>(
    (TYPES as readonly string[]).includes(initial || '') ? (initial as OrnamentType) : 'birds',
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Resolve the couple's SAVED palette from the same source the Palette tab and
  // landing-page explorer use, so the preview's ambient background + ornament
  // tint match exactly what the published invitation renders.
  const vibe = TEMPLATE_VIBES.find((v) => v.id === 'lovebirds')!
  const active: PaletteVibe =
    vibe.palettes.find((p) => p.key === palette) ?? vibe.palettes[0]
  // Softer accent for the back wing (the real ornaments use --accent-soft).
  const accentSoft = `color-mix(in srgb, ${active.accent} 55%, #ffffff)`

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ornamentType: type }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); setMsg({ kind: 'err', text: e.error || t.saveFailed }); fb.fail(fm.saveFail); return }
      const data = await res.json().catch(() => ({}))
      setMsg({ kind: 'ok', text: t.savedOk })
      fb.ok(fm.ornamentSaved)
      if (data?.savedAt) onSaved?.(data.savedAt)
      broadcastEditorSave(slug, 'ornament', data?.savedAt)
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || t.networkError }); fb.fail(fm.saveFail) }
    finally { setSaving(false) }
  }

  const labels: Record<OrnamentType, string> = { birds: t.birds, butterflies: t.butterflies, perched: t.perched }

  return (
    <div style={card}>
      <OrnamentPreviewStyle />
      <header><div style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }}><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></div></header>

      {/* Live preview — the selected motif painted in the saved palette's accent
          over that palette's ambient background, animated like the real
          invitation (flying + flapping, or perched + bobbing). */}
      <div style={{ ...previewPanel, background: active.background, borderColor: active.surfaceBorder }}>
        <PreviewScene type={type} accent={active.accent} accentSoft={accentSoft} paletteKey={active.key} />
        <span style={{ ...paletteChip, color: active.fgMuted, borderColor: active.surfaceBorder }}>
          <span style={{ width: 11, height: 11, borderRadius: 'var(--radius-round)', background: active.accent, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
          {active.label}
        </span>
      </div>

      <div style={grid}>
        {TYPES.map((ty) => (
          <button
            key={ty}
            type="button"
            onClick={() => setType(ty)}
            className={`${ctrl.optCard} ${type === ty ? ctrl.optCardActive : ''}`}
          >
            <svg viewBox="0 0 64 64" width="40" height="40" style={{ fill: active.accent, color: active.accent }}
                 dangerouslySetInnerHTML={{ __html: PREVIEW[ty] }} />
            <span style={{ fontSize: 13 }}>{labels[ty]}</span>
          </button>
        ))}
      </div>
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" className={ctrl.btnPrimary} onClick={save} disabled={saving}>{saving ? t.saving : t.save}</button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 'clamp(16px, 3vw, 28px)', boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }
const previewPanel: React.CSSProperties = { position: 'relative', height: 240, borderRadius: 'var(--radius-md)', border: '1px solid', overflow: 'hidden' }
const paletteChip: React.CSSProperties = { position: 'absolute', left: 14, bottom: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid', background: 'rgba(255,255,255,0.55)', fontSize: 12, backdropFilter: 'blur(6px)' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }
const optBtn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 14px', borderRadius: 'var(--radius-md)', border: '1px solid', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { height: 36, padding: '1px 20px 0 20px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
const msgOk: React.CSSProperties = { fontSize: 12, color: 'var(--color-emerald)', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)', marginRight: 'auto' }
