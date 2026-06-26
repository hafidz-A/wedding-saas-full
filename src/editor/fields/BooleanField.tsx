'use client'

interface Props {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  help?: string
}

export default function BooleanField({ label, value, onChange, help }: Props) {
  return (
    <div style={wrap}>
      <label style={row}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <span style={lbl}>{label}</span>
      </label>
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 4 }
const row:  React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }
const lbl:  React.CSSProperties = { fontSize: 13, color: 'var(--text-primary)' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginLeft: 28 }
