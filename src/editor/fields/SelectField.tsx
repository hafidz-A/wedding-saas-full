'use client'

interface Props {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  help?: string
}

export default function SelectField({ label, value, options, onChange, help }: Props) {
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={select}
      >
        {(value === '' || value == null) && <option value="">— select —</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const select: React.CSSProperties = { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, background: 'var(--surface-raised)', outline: 'none' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
