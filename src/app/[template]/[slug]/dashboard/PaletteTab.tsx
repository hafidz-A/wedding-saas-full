'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import { broadcastEditorSave } from '@/editor/lib/editorSync'
import { TEMPLATE_VIBES, type PaletteVibe } from '@/components/marketing/vibeData'
import { PreviewMock } from '@/components/marketing/PreviewMock'
import ctrl from './dashboardControls.module.css'

/** Format an ISO datetime into an Indonesian long date (e.g. "12 Desember 2026").
 *  Returns '' for missing/unparseable input so the preview just omits the line. */
function formatWeddingDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

export default function PaletteTab({
  slug,
  template,
  initial,
  coupleName,
  weddingDate,
  onSaved,
}: {
  slug: string
  template?: string
  initial?: string
  coupleName?: string
  weddingDate?: string
  onSaved?: (savedAt: string) => void
}) {
  const t = useDashboardDict().tabs.palette
  const fm = useDashboardDict().feedback
  const fb = useFeedback()

  // Real palette tokens (gradient, surface, accent, fg) — the SAME source the
  // landing-page template-buying preview uses, so the dashboard preview is
  // pixel-identical, not a simplified lookalike.
  const vibe =
    (template && TEMPLATE_VIBES.find((v) => v.id === template)) ||
    TEMPLATE_VIBES.find((v) => v.id === 'lovebirds')!
  const palettes = vibe.palettes

  const initialKey = palettes.some((p) => p.key === initial) ? (initial as string) : palettes[0].key
  const [palette, setPalette] = useState(initialKey)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const active: PaletteVibe = palettes.find((p) => p.key === palette) ?? palettes[0]
  const names = coupleName?.trim() || t.previewHeading
  const date = formatWeddingDate(weddingDate)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPalette: palette }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: e.error || t.saveFailed })
        fb.fail(fm.saveFail)
        return
      }
      const data = await res.json().catch(() => ({}))
      setMsg({ kind: 'ok', text: t.savedOk })
      fb.ok(fm.paletteSaved)
      // Let an open section editor of this invitation rebase its save baseline —
      // same-tab via onSaved, other browser tabs via the broadcast.
      if (data?.savedAt) onSaved?.(data.savedAt)
      broadcastEditorSave(slug, 'palette', data?.savedAt)
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || t.networkError })
      fb.fail(fm.saveFail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={card}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }}><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></div>
        <button type="button" className={ctrl.btnPrimary} onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </button>
      </header>

      {/* Preview panel — painted with the selected palette's real ambient
          gradient, exactly like the landing-page explorer. Menu re-themes the
          big PreviewMock card on selection. */}
      <div style={{ ...panel, background: active.background }}>
        <div style={layoutRow}>
          <div style={menuWrap} role="radiogroup" aria-label={t.title}>
            {palettes.map((p) => {
              const selected = p.key === palette
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={p.label}
                  onClick={() => setPalette(p.key)}
                  className={ctrl.paletteMenuBtn}
                  style={{
                    fontWeight: selected ? 600 : 500,
                    color: selected ? p.accent : active.fgMuted,
                    borderColor: selected ? p.accent : active.surfaceBorder,
                    background: selected ? `${p.accent}1a` : 'transparent',
                  }}
                >
                  <span style={{ ...bullet, background: p.accent, transform: selected ? 'scale(1.25)' : 'none' }} />
                  {p.label}
                </button>
              )
            })}
          </div>

          <div style={display}>
            <PreviewMock
              templateId={vibe.id}
              palette={active}
              eyebrow={t.previewEyebrow}
              names={names}
              date={date}
              glass
            />
            <div style={details}>
              <h3 style={{ ...paletteName, color: active.fg }}>{active.label}</h3>
              <div style={swatches}>
                {active.swatches.map((c, i) => (
                  <span key={i} style={{ ...swatch, background: c, borderColor: active.surfaceBorder }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" className={ctrl.btnPrimary} onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 'clamp(16px, 3vw, 28px)', boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }
const panel: React.CSSProperties = { borderRadius: 'var(--radius-md)', padding: 'clamp(20px, 3vw, 36px)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }
const layoutRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px, 3vw, 40px)', alignItems: 'center', justifyContent: 'center' }
const menuWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 190px', minWidth: 0, maxWidth: 240 }
const menuBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 9, width: '100%', minWidth: 0, height: 36, padding: '1px 16px 0 16px', lineHeight: 1, borderRadius: '999px', border: '1px solid', fontFamily: 'var(--font-body, system-ui)', fontSize: 13, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', transition: 'color 0.3s ease, border-color 0.3s ease, background 0.3s ease' }
const bullet: React.CSSProperties = { width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto', transition: 'transform 0.3s ease' }
const display: React.CSSProperties = { flex: '2 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(18px, 2.5vw, 28px)' }
const details: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
const paletteName: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontWeight: 500, fontSize: 'clamp(24px, 3.4vw, 34px)', lineHeight: 1.1, margin: 0, textAlign: 'center' }
const swatches: React.CSSProperties = { display: 'flex', gap: 8 }
const swatch: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: '1px solid', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { height: 36, padding: '1px 20px 0 20px', borderRadius: '999px', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
const msgOk: React.CSSProperties = { fontSize: 12, color: 'var(--color-emerald)', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)', marginRight: 'auto' }
