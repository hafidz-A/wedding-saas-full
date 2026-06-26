'use client'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

/**
 * Stores ISO 8601 string (e.g. "2025-11-15T16:00:00"). Browser
 * datetime-local input uses "YYYY-MM-DDTHH:MM" — we strip seconds
 * from the stored value for display, then re-append ":00" on change.
 */
export default function DatetimeField({ label, value, onChange, help }: Props) {
  const local = typeof value === 'string' ? value.slice(0, 16) : ''
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : '')}
        style={input}
      />
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input:React.CSSProperties = { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
