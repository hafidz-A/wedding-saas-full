'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'

interface MetaSettings {
  title?: string
  description?: string
  ogImage?: string
}

interface Props {
  slug: string
  template?: string
  initial?: MetaSettings | null
}

const TITLE_MAX = 120
const DESC_MAX = 200

export default function MetaTab({ slug, template, initial }: Props) {
  const t = useDashboardDict().tabs.meta
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [ogImage, setOgImage] = useState(initial?.ogImage ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Computed after mount to avoid an SSR/client hydration mismatch on the host.
  const [host, setHost] = useState(`…/${slug}`)
  useEffect(() => {
    setHost(`${window.location.host}/${template ?? ''}/${slug}`.replace(/\/+$/, ''))
  }, [template, slug])

  const previewTitle = title.trim() || t.previewTitleFallback
  const previewDesc = description.trim() || t.previewDescFallback

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('slug', slug)
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: err.error || `${t.uploadFailed} (${res.status})` })
        fb.fail(fm.uploadFail)
        return
      }
      const data = await res.json()
      setOgImage(data.url)
      fb.ok(fm.imageUploaded)
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || t.uploadFailed })
      fb.fail(fm.uploadFail)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, ogImage }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: e.error || t.saveFailed })
        fb.fail(fm.saveFail)
        return
      }
      setMsg({ kind: 'ok', text: t.savedOk })
      fb.ok(fm.detailsSaved)
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
        <div>
          <h2 style={h2}>{t.title}</h2>
          <p style={sub}>{t.subtitle}</p>
        </div>
        <button type="button" style={btnPrimary} onClick={save} disabled={saving || uploading}>
          {saving ? t.saving : t.save}
        </button>
      </header>

      {/* ── Text fields ── */}
      <section style={section}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{t.fTitle}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setMsg(null) }}
            maxLength={TITLE_MAX}
            placeholder={t.fTitlePlaceholder}
            style={input}
          />
          <span style={counter}>{title.length}/{TITLE_MAX}</span>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{t.fDesc}</span>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setMsg(null) }}
            maxLength={DESC_MAX}
            rows={2}
            placeholder={t.fDescPlaceholder}
            style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
          />
          <span style={counter}>{description.length}/{DESC_MAX}</span>
        </label>
        <p style={help}>{t.hint}</p>
      </section>

      {/* ── Share photo (og:image) ── */}
      <section style={section}>
        <h3 style={h3}>{t.fImage}</h3>
        <div style={imageRow}>
          <div style={imageThumb}>
            {ogImage
              ? <img src={ogImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22, color: 'var(--color-gold)' }}>✦</span>}
          </div>
          <div style={btnsCol}>
            <button type="button" style={btnGhost} onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? t.uploading : (ogImage ? t.imageReplace : t.imageUpload)}
            </button>
            {ogImage && (
              <button type="button" style={btnGhostDanger} onClick={() => { setOgImage(''); setMsg(null) }}>
                {t.imageRemove}
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={onPickFile}
        />
        <p style={help}>{t.imageHint}</p>
      </section>

      {/* ── Share preview ── */}
      <section style={section}>
        <h3 style={h3}>{t.previewLabel}</h3>
        <div style={preview}>
          <div style={previewThumb}>
            {ogImage
              ? <img src={ogImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>✦</span>}
          </div>
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            <span style={previewTitleStyle}>{previewTitle}</span>
            <span style={previewDescStyle}>{previewDesc}</span>
            <span style={previewHost}>{host}</span>
          </div>
        </div>
      </section>

      {/* ── Actions ── */}
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" style={btnPrimary} onClick={save} disabled={saving || uploading}>
          {saving ? t.saving : t.save}
        </button>
      </footer>
    </div>
  )
}

// ── Styles (mirrors PaletteTab / MusicTab) ──
const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 28, boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.5 }
const section: React.CSSProperties = { display: 'grid', gap: 14, padding: 18, background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input: React.CSSProperties = { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const counter: React.CSSProperties = { fontSize: 10, color: 'rgba(42,33,24,0.4)', justifySelf: 'end' }
const help: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.5)', margin: 0, lineHeight: 1.5 }
const imageRow: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'center' }
const imageThumb: React.CSSProperties = { width: 96, height: 54, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--color-charcoal), var(--color-charcoal-light))', border: '1px solid var(--border-default)' }
const btnsCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }
const preview: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: '#F7F3EA' }
const previewThumb: React.CSSProperties = { width: 54, height: 54, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'linear-gradient(135deg, var(--color-charcoal), var(--color-charcoal-light))', color: 'var(--color-gold)', display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }
const previewTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const previewDescStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const previewHost: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.45)', textTransform: 'lowercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'transparent', color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid var(--border-strong)', cursor: 'pointer' }
const btnGhostDanger: React.CSSProperties = { ...btnGhost, color: 'var(--interactive-primary-hover)', borderColor: 'rgba(196,63,42,0.35)' }
const msgOk: React.CSSProperties = { fontSize: 12, color: 'var(--color-emerald)', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)', marginRight: 'auto' }
