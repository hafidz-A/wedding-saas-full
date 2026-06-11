'use client'

import { useRef } from 'react'
import { useUpload } from '../lib/useUpload'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  slug: string
  help?: string
}

export default function ImageField({ label, value, onChange, slug, help }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)
  const t = useDashboardDict().editor

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file)
    if (url) onChange(url)
    e.target.value = ''
  }

  return (
    <div style={wrap}>
      <span style={lbl}>{label}</span>
      <div style={row}>
        {value ? (
          <img src={value} alt="" style={thumb} />
        ) : (
          <div style={placeholder}>No image</div>
        )}
        <div style={btns}>
          <button type="button" style={btn} disabled={isUploading} onClick={() => fileInput.current?.click()}>
            {isUploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button type="button" style={btnGhost} onClick={() => onChange('')}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={onPick}
        />
      </div>
      {error && <span style={errStyle}>{error}</span>}
      {help && <span style={hlp}>{help}</span>}
      {!value && <span style={hintStyle}>{t.imageEmptyHint}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 8 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const row:  React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14 }
const thumb: React.CSSProperties = { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(42,33,24,0.12)' }
const placeholder: React.CSSProperties = { width: 80, height: 80, borderRadius: 8, border: '1px dashed rgba(42,33,24,0.25)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'rgba(42,33,24,0.5)' }
const btns: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const btn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'transparent', color: '#2A2118', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(42,33,24,0.2)', cursor: 'pointer' }
const errStyle: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
const hintStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)', fontStyle: 'italic' }
