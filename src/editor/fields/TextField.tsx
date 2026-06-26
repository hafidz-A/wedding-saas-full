'use client'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

export default function TextField({ label, value, onChange, help }: Props) {
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
      {help && (
        <span style={hlp}>
          <span aria-hidden style={infoIcon}>i</span>
          <span>{help}</span>
        </span>
      )}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input:React.CSSProperties = { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)' }
const hlp:  React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }
const infoIcon: React.CSSProperties = { flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, marginTop: 1, borderRadius: '50%', background: 'rgba(42,33,24,0.22)', color: '#fff', fontSize: 9, fontWeight: 700, fontStyle: 'italic' }
