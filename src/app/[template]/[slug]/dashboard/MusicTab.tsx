'use client'

import { useRef, useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'

interface MusicSettings {
  url?: string
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
}

const DEFAULTS: Required<Omit<MusicSettings, 'url'>> & { url: string } = {
  url: '',
  enabled: true,
  title: 'Putar musik latar?',
  subtitle: 'Nikmati pengalaman undangan lebih lengkap',
  acceptLabel: 'Putar',
  dismissLabel: 'Nanti',
  loop: true,
}

export default function MusicTab({ slug, initial }: Props) {
  const t = useDashboardDict().tabs.music
  const confirmDialog = useConfirm()
  const [music, setMusic] = useState<typeof DEFAULTS>({
    ...DEFAULTS,
    ...(initial || {}),
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
        return
      }
      const data = await res.json()
      update('url', data.url)
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.uploadFailed })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload = music.url
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
        return
      }
      setSaveMsg({ kind: 'ok', text: t.savedMsg })
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.networkError })
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
      if (res.ok) setSaveMsg({ kind: 'ok', text: t.cleared })
      else setSaveMsg({ kind: 'err', text: `${t.clearFailed} (${res.status})` })
    } catch (err: any) {
      setSaveMsg({ kind: 'err', text: err?.message || t.networkError })
    } finally {
      setSaving(false)
    }
  }

  const filename = music.url ? music.url.split('/').pop()?.replace(/^\d+-/, '') : null

  return (
    <div style={card}>
      <header style={headerRow}>
        <div>
          <h2 style={h2}>{t.title}</h2>
          <p style={sub}>{t.subtitle}</p>
        </div>
        {music.url && (
          <span style={music.enabled ? badgeOn : badgeOff}>
            {music.enabled ? t.on : t.off}
          </span>
        )}
      </header>

      {/* ── Upload ── */}
      <section style={section}>
        <h3 style={h3}>{t.s1}</h3>
        {music.url ? (
          <div style={audioRow}>
            <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={fname} title={filename || ''}>{filename || 'audio.mp3'}</span>
              <audio src={music.url} controls preload="metadata" style={{ width: '100%', height: 36 }} />
            </div>
            <div style={btnsCol}>
              <button type="button" style={btnGhost} onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? t.uploading : t.replace}
              </button>
              <button type="button" style={btnGhostDanger} onClick={() => update('url', '')}>
                {t.remove}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            style={btnPrimary}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
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
          {music.url && (
            <button type="button" style={btnGhostDanger} onClick={clearMusic} disabled={saving}>
              {t.clearAll}
            </button>
          )}
          <button type="button" style={btnPrimary} onClick={save} disabled={saving || uploading}>
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
          width: 38, height: 22, borderRadius: 999,
          background: checked ? '#2D8C4E' : 'rgba(42,33,24,0.2)',
          position: 'relative', transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: checked ? 18 : 2,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
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
      <span style={{ fontSize: 13, color: '#2A2118' }}>{label}</span>
    </label>
  )
}

// ── Styles ──
const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const headerRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)', maxWidth: 540, lineHeight: 1.5 }
const section: React.CSSProperties = { display: 'grid', gap: 12, padding: 18, background: '#fff', borderRadius: 12, border: '1px solid rgba(42,33,24,0.08)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,33,24,0.6)', margin: 0, fontWeight: 600 }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.55)' }
const input: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.16)', fontSize: 13, outline: 'none', background: '#fff', color: '#2A2118' }
const audioRow: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'center' }
const btnsCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }
const fname: React.CSSProperties = { fontSize: 13, color: '#2A2118', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const help: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.5)', margin: 0 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'transparent', color: '#2A2118', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(42,33,24,0.2)', cursor: 'pointer' }
const btnGhostDanger: React.CSSProperties = { ...btnGhost, color: '#C43F2A', borderColor: 'rgba(196,63,42,0.35)' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const badgeOn: React.CSSProperties = { padding: '4px 10px', borderRadius: 999, background: '#E0F2E5', color: '#2D8C4E', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em' }
const badgeOff: React.CSSProperties = { ...badgeOn, background: 'rgba(42,33,24,0.08)', color: 'rgba(42,33,24,0.6)' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
