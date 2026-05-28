'use client'

import { useRef, useState } from 'react'

interface Props {
  slug: string
  /** Current saved value. Possible states:
   *   - undefined → fallback to bundled default `/images/wedding-animation.gif`
   *   - ''        → user explicitly cleared (no GIF on the page)
   *   - URL       → custom uploaded GIF
   */
  initial?: string | null
}

const DEFAULT_GIF = '/images/wedding-animation.gif'

export default function BackgroundTab({ slug, initial }: Props) {
  const [gif, setGif] = useState<string | null>(initial === undefined ? null : initial)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Resolved preview (what the public page would actually render):
  //   null/undefined → default GIF
  //   '' → hidden
  //   URL → that URL
  const previewSrc = gif === null ? DEFAULT_GIF : gif
  const isUsingDefault = gif === null
  const isHidden = gif === ''

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side guard: GIF only
    if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
      setMsg({ kind: 'err', text: 'Hanya file .gif yang diterima' })
      e.target.value = ''
      return
    }

    setUploading(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('slug', slug)
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: err.error || `Upload failed (${res.status})` })
        return
      }
      const data = await res.json()
      setGif(data.url)
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Upload failed' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save(value: string | null) {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/background`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bgGif: value }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: err.error || `Save failed (${res.status})` })
        return false
      }
      setMsg({ kind: 'ok', text: 'Saved ✓' })
      return true
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Network error' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const filename = gif ? gif.split('/').pop()?.replace(/^\d+-/, '') : null

  return (
    <div style={card}>
      <header style={headerRow}>
        <div>
          <h2 style={h2}>Background GIF</h2>
          <p style={sub}>
            Ganti animasi latar undangan (default: burung terbang). Hanya
            file <strong>.gif</strong> yang diterima. Maks 5 MB.
          </p>
        </div>
        <span style={isUsingDefault ? badgeDefault : isHidden ? badgeOff : badgeOn}>
          {isUsingDefault ? 'DEFAULT' : isHidden ? '○ HIDDEN' : '● CUSTOM'}
        </span>
      </header>

      <section style={section}>
        <h3 style={h3}>Preview</h3>
        <div style={previewBox}>
          {previewSrc ? (
            <img src={previewSrc} alt="" style={previewImg} />
          ) : (
            <div style={hiddenBox}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(42,33,24,0.55)' }}>
                Tidak ada GIF — section akan kosong di posisi ini.
              </p>
            </div>
          )}
        </div>
        {filename && (
          <p style={fname} title={filename}>📎 {filename}</p>
        )}
      </section>

      <section style={section}>
        <h3 style={h3}>Upload custom GIF</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            style={btnPrimary}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : gif ? '⬆ Replace GIF' : '⬆ Upload GIF'}
          </button>
          {gif && (
            <button
              type="button"
              style={btnGhost}
              onClick={() => save('')}
              disabled={saving}
              title="Sembunyikan GIF di halaman undangan"
            >
              Hide GIF
            </button>
          )}
          {!isUsingDefault && (
            <button
              type="button"
              style={btnGhostDanger}
              onClick={() => {
                if (confirm('Reset ke GIF default (burung terbang)?')) {
                  setGif(null)
                  save(null)
                }
              }}
              disabled={saving}
            >
              Reset ke default
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/gif,.gif"
          hidden
          onChange={onPickFile}
        />
        <p style={help}>
          Setelah upload, klik <strong>Save</strong> di bawah untuk menerapkan.
        </p>
      </section>

      <footer style={footer}>
        {msg && (
          <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            style={btnPrimary}
            onClick={() => save(gif)}
            disabled={saving || uploading}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  )
}

// ── Styles ──
const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const headerRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)', maxWidth: 540, lineHeight: 1.5 }
const section: React.CSSProperties = { display: 'grid', gap: 12, padding: 18, background: '#fff', borderRadius: 12, border: '1px solid rgba(42,33,24,0.08)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,33,24,0.6)', margin: 0, fontWeight: 600 }
const previewBox: React.CSSProperties = { width: '100%', maxWidth: 320, aspectRatio: '4 / 3', background: '#f5efe3', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(42,33,24,0.08)', display: 'grid', placeItems: 'center' }
const previewImg: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
const hiddenBox: React.CSSProperties = { padding: 24, textAlign: 'center' }
const fname: React.CSSProperties = { margin: 0, fontSize: 11, color: 'rgba(42,33,24,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const help: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.5)', margin: 0 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'transparent', color: '#2A2118', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(42,33,24,0.2)', cursor: 'pointer' }
const btnGhostDanger: React.CSSProperties = { ...btnGhost, color: '#C43F2A', borderColor: 'rgba(196,63,42,0.35)' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const badgeOn: React.CSSProperties = { padding: '4px 10px', borderRadius: 999, background: '#E0F2E5', color: '#2D8C4E', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em' }
const badgeOff: React.CSSProperties = { ...badgeOn, background: 'rgba(42,33,24,0.08)', color: 'rgba(42,33,24,0.6)' }
const badgeDefault: React.CSSProperties = { ...badgeOn, background: 'rgba(232,200,122,0.18)', color: '#8a6a14' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
