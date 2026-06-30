'use client'

import { useEffect, useState } from 'react'
import { snapQuotaToBlock, BLOCK_SIZE } from '@/lib/payments/quota'

/**
 * "− [editable number] +" control. The buttons step by 50; a free-typed value
 * snaps UP to the next 50 on commit (blur / Enter). Always emits a clamped,
 * valid value via onChange. The snap is UX only — callers must still validate
 * server-side.
 */
export default function QuotaStepper({
  value,
  min,
  max,
  onChange,
  typableHint,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  typableHint?: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
    const snapped = snapQuotaToBlock(Number.isNaN(n) ? min : n, min, max)
    onChange(snapped)
    setText(String(snapped))
  }
  const step = (delta: number) => onChange(snapQuotaToBlock(value + delta, min, max))

  return (
    <div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label="Kurangi"
          onClick={() => step(-BLOCK_SIZE)}
          disabled={value <= min}
          style={btn}
        >
          −
        </button>
        <input
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(text)
            }
          }}
          style={numInput}
          aria-label="Jumlah tamu"
        />
        <button
          type="button"
          aria-label="Tambah"
          onClick={() => step(BLOCK_SIZE)}
          disabled={value >= max}
          style={btn}
        >
          +
        </button>
      </div>
      {typableHint && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{typableHint}</p>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  background: 'var(--surface-warm)',
  color: 'var(--text-primary)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
}
const numInput: React.CSSProperties = {
  width: 88,
  height: 36,
  textAlign: 'center',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  fontSize: 16,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
