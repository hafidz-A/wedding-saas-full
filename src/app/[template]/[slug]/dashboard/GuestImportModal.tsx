'use client'

import { useMemo, useState, useTransition } from 'react'
import { parseGuestImport } from '@/lib/guests/parse-import'
import { formatPhoneDisplay } from '@/lib/guests/phone'
import { importGuests } from './guests/actions'

export default function GuestImportModal({
  slug,
  onClose,
}: {
  slug: string
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => parseGuestImport(text), [text])

  const handleImport = () => {
    if (preview.length === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await importGuests(slug, text)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import gagal')
      }
    })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <h3 style={{ margin: 0 }}>Import Daftar Tamu</h3>
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Tutup">
            ×
          </button>
        </header>

        <p style={hint}>
          <b>Format:</b> satu tamu per baris. Pisahkan nama dan nomor dengan{' '}
          <b>TAB</b> (copy dari Excel/Google Sheets langsung jadi). Nomor opsional.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Agus Salim\t081234567890\nBudi Santoso\nBapak Hendra, S.E.\t087654321098'}
          rows={10}
          style={textarea}
        />

        <div style={{ marginTop: 14, fontSize: 13 }}>
          <b>{preview.length}</b> tamu siap di-import.
          {preview.length > 0 && (
            <div style={previewBox}>
              {preview.slice(0, 5).map((r) => (
                <div
                  key={r.lineNo}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}
                >
                  <span>{r.name}</span>
                  <span style={{ color: r.phoneE164 ? '#2D8C4E' : '#aaa' }}>
                    {r.phoneE164 ? formatPhoneDisplay(r.phoneE164) : '(tanpa nomor)'}
                  </span>
                </div>
              ))}
              {preview.length > 5 && (
                <div style={{ color: '#5C4A3A', marginTop: 4 }}>
                  …dan {preview.length - 5} lagi
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p style={{ color: '#E8553E', fontSize: 13 }}>{error}</p>}

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={pending || preview.length === 0}
            style={primaryBtn}
          >
            {pending ? 'Mengimpor…' : `Import ${preview.length} tamu`}
          </button>
        </footer>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(20,16,12,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
}
const dialog: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  maxWidth: 560,
  width: '100%',
  maxHeight: 'min(90vh, 90dvh)',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}
const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
}
const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  fontSize: 22,
  lineHeight: 1,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
}
const hint: React.CSSProperties = { fontSize: 13, color: '#5C4A3A', margin: '8px 0 12px' }
const textarea: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13,
  padding: 12,
  borderRadius: 10,
  border: '1px solid rgba(42,33,24,0.16)',
  resize: 'vertical',
  minHeight: 200,
}
const previewBox: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 12px',
  background: 'rgba(42,33,24,0.04)',
  borderRadius: 10,
  fontSize: 13,
}
const primaryBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: '#E8553E',
  color: '#fff',
  border: 0,
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
}
const ghostBtn: React.CSSProperties = {
  padding: '10px 14px',
  background: 'transparent',
  color: '#2A2118',
  border: '1px solid rgba(42,33,24,0.2)',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
}
