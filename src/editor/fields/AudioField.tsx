'use client'

import { useRef } from 'react'
import { useUpload } from '../lib/useUpload'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  slug: string
  help?: string
}

export default function AudioField({ label, value, onChange, slug, help }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)
  const fm = useDashboardDict().feedback
  const fb = useFeedback()

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file)
    if (url) {
      onChange(url)
      fb.ok(fm.audioUploaded)
    } else {
      fb.fail(fm.uploadFail)
    }
    e.target.value = ''
  }

  const filename = value ? value.split('/').pop()?.replace(/^\d+-/, '') : null

  return (
    <div style={wrap}>
      <span style={lbl}>{label}</span>
      <div style={row}>
        <div style={iconBox}>
          <span style={{ fontSize: 22 }}>{value ? '🎵' : '♪'}</span>
        </div>
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
          {value ? (
            <>
              <span style={fname} title={filename || ''}>{filename || 'Audio file'}</span>
              <audio src={value} controls preload="metadata" style={player} />
            </>
          ) : (
            <span style={empty}>No audio yet</span>
          )}
          <div style={btns}>
            <button type="button" style={btn} disabled={isUploading} onClick={() => fileInput.current?.click()}>
              {isUploading ? 'Uploading…' : value ? 'Replace MP3' : 'Upload MP3'}
            </button>
            {value && (
              <button type="button" style={btnGhost} onClick={() => onChange('')}>
                Remove
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/x-m4a,audio/mp4"
          hidden
          onChange={onPick}
        />
      </div>
      {error && <span style={errStyle}>{error}</span>}
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 8 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const row:  React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 14 }
const iconBox: React.CSSProperties = { width: 80, height: 80, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'grid', placeItems: 'center', background: 'var(--surface-raised)', flexShrink: 0 }
const fname: React.CSSProperties = { fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const player: React.CSSProperties = { width: '100%', height: 32 }
const empty: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.5)' }
const btns: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
const btn:  React.CSSProperties = { padding: '7px 13px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '7px 13px', borderRadius: 'var(--radius-pill)', background: 'transparent', color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid var(--border-strong)', cursor: 'pointer' }
const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
