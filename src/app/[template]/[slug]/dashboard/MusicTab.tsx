'use client'

import { useRef, useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import { broadcastEditorSave } from '@/editor/lib/editorSync'
import { type MusicSourceKind } from '@/lib/music/source'
import ctrl from './dashboardControls.module.css'

interface MusicSettings {
  source?: MusicSourceKind
  url?: string
  youtubeId?: string
  enabled?: boolean
  title?: string
  subtitle?: string
  acceptLabel?: string
  dismissLabel?: string
  loop?: boolean
}

interface Props {
  slug: string
  initial?: MusicSettings | null
  onSaved?: (savedAt: string) => void
}

const DEFAULTS: Required<Omit<MusicSettings, 'url' | 'youtubeId'>> & { url: string } = {
  source: 'upload',
  url: '',
  enabled: true,
  title: 'Putar musik latar?',
  subtitle: 'Nikmati pengalaman undangan lebih lengkap',
  acceptLabel: 'Putar',
  dismissLabel: 'Nanti',
  loop: true,
}

export default function MusicTab({ slug, initial, onSaved }: Props) {
  const t = useDashboardDict().tabs.music
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const confirmDialog = useConfirm()
  const [music, setMusic] = useState<typeof DEFAULTS>(() => {
    const merged = { ...DEFAULTS, ...(initial || {}) }
    // Only mp3 upload is supported now — pin the source regardless of any legacy
    // value (url / youtube / library). A legacy non-upload track shows as empty
    // here; saving migrates it to the uploaded file (or clears it).
    merged.source = 'upload'
    return merged
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const update = <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) => {
    setMusic((prev) => ({ ...prev, [key]: value }))
    setSaveMsg(null)
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setSaveMsg(null)
    try {
      const form = new FormData()
      form.append('slug', slug)
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveMsg({ kind: 'err', text: err.error || `${t.uploadFailed} (${res.status})` })
        fb.fail(fm.uploadFail)
        return
      }
      const data = await res.json()
      update('url', data.url)
      fb.ok(fm.musicUploaded)
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.uploadFailed })
      fb.fail(fm.uploadFail)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const hasTrack = !!music.url
      const payload = hasTrack
        ? { music }
        : { music: null }
      const res = await fetch(`/api/invitation/${slug}/music`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveMsg({ kind: 'err', text: err.error || `${t.saveFailed} (${res.status})` })
        fb.fail(fm.saveFail)
        return
      }
      const data = await res.json().catch(() => ({}))
      setSaveMsg({ kind: 'ok', text: t.savedMsg })
      fb.ok(fm.musicSaved)
      if (data?.savedAt) onSaved?.(data.savedAt)
      broadcastEditorSave(slug, 'music', data?.savedAt)
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.networkError })
      fb.fail(fm.saveFail)
    } finally {
      setSaving(false)
    }
  }

  async function clearMusic() {
    if (!(await confirmDialog({ message: t.clearConfirm, tone: 'danger' }))) return
    setMusic({ ...DEFAULTS })
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/music`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ music: null }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveMsg({ kind: 'ok', text: t.cleared })
        fb.ok(fm.musicRemoved)
        if (data?.savedAt) onSaved?.(data.savedAt)
        broadcastEditorSave(slug, 'music', data?.savedAt)
      } else {
        setSaveMsg({ kind: 'err', text: `${t.clearFailed} (${res.status})` })
        fb.fail(fm.saveFail)
      }
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.networkError })
      fb.fail(fm.saveFail)
    } finally {
      setSaving(false)
    }
  }

  const filename = music.url ? music.url.split('/').pop()?.replace(/^\d+-/, '') : null
  const hasTrack = !!music.url

  return (
    <div style={card}>
      <header style={headerRow}>
        <div style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }}>
          <h2 style={h2}>{t.title}</h2>
          <p style={sub}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasTrack && (
            <span style={music.enabled ? badgeOn : badgeOff}>
              {music.enabled ? t.on : t.off}
            </span>
          )}
          <button type="button" className={ctrl.btnPrimary} onClick={save} disabled={saving || uploading}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </header>

      {/* ── Source: mp3 upload only ── */}
      <section style={section}>
        <h3 style={h3}>{t.s1}</h3>
        {music.url ? (
          <div style={audioRow}>
            <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={fname} title={filename || ''}>{filename || 'audio.mp3'}</span>
              <audio src={music.url} controls preload="metadata" style={{ width: '100%', height: 36 }} />
            </div>
            <div style={btnsCol}>
              <button type="button" className={ctrl.btnGhost} onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? t.uploading : t.replace}
              </button>
              <button type="button" className={ctrl.btnGhostDanger} onClick={() => update('url', '')}>
                {t.remove}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={ctrl.btnPrimary} onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? t.uploading : t.upload}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/x-m4a,audio/mp4"
          hidden
          onChange={onPickFile}
        />
        <p style={help}>{t.help}</p>
      </section>

      {/* ── Popup wording ── */}
      <section style={section}>
        <h3 style={h3}>{t.s2}</h3>
        <div style={grid2}>
          <Field label={t.fTitle} value={music.title} onChange={(v) => update('title', v)} maxLength={60} />
          <Field label={t.fSubtitle} value={music.subtitle} onChange={(v) => update('subtitle', v)} maxLength={120} />
          <Field label={t.fAccept} value={music.acceptLabel} onChange={(v) => update('acceptLabel', v)} maxLength={20} />
          <Field label={t.fDismiss} value={music.dismissLabel} onChange={(v) => update('dismissLabel', v)} maxLength={20} />
        </div>
      </section>

      {/* ── Behaviour ── */}
      <section style={section}>
        <h3 style={h3}>{t.s3}</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <Toggle
            label={t.enabledLabel}
            checked={music.enabled !== false}
            onChange={(v) => update('enabled', v)}
          />
          <Toggle
            label={t.loopLabel}
            checked={music.loop !== false}
            onChange={(v) => update('loop', v)}
          />
        </div>
      </section>

      {/* ── Actions ── */}
      <footer style={footer}>
        {saveMsg && (
          <span style={saveMsg.kind === 'ok' ? msgOk : msgErr}>{saveMsg.text}</span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {hasTrack && (
            <button type="button" className={ctrl.btnGhostDanger} onClick={clearMusic} disabled={saving}>
              {t.clearAll}
            </button>
          )}
          <button type="button" className={ctrl.btnPrimary} onClick={save} disabled={saving || uploading}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </footer>
    </div>
  )
}

function Field({
  label, value, onChange, maxLength,
}: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={lbl}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        style={input}
      />
    </label>
  )
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <span
        style={{
          width: 38, height: 22, borderRadius: 'var(--radius-pill)',
          background: checked ? '#2D8C4E' : 'var(--border-strong)',
          position: 'relative', transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: checked ? 18 : 2,
            width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-raised)',
            transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
    </label>
  )
}

// ── Styles ──
const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 'clamp(16px, 3vw, 28px)', boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 24 }
const headerRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }
const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 540, lineHeight: 1.5 }
const section: React.CSSProperties = { display: 'grid', gap: 12, padding: 16, background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input: React.CSSProperties = { height: 38, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)', boxSizing: 'border-box' }
const audioRow: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'center' }
const btnsCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }
const fname: React.CSSProperties = { fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const help: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.5)', margin: 0 }
const btnPrimary: React.CSSProperties = { height: 36, padding: '1px 20px 0 20px', borderRadius: '999px', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
const btnGhost: React.CSSProperties = { height: 36, padding: '1px 16px 0 16px', borderRadius: '999px', background: 'transparent', color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid var(--border-strong)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
const btnGhostDanger: React.CSSProperties = { ...btnGhost, color: 'var(--interactive-primary-hover)', borderColor: 'rgba(196,63,42,0.35)' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }
const badgeOn: React.CSSProperties = { padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--status-success-surface)', color: 'var(--color-emerald)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em' }
const badgeOff: React.CSSProperties = { ...badgeOn, background: 'var(--border-subtle)', color: 'var(--text-muted)' }
const msgOk: React.CSSProperties = { fontSize: 12, color: 'var(--color-emerald)' }
const msgErr: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)' }
