'use client'

interface Props {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  help?: string
  itemPlaceholder?: string
}

export default function StringArrayField({ label, value, onChange, help, itemPlaceholder }: Props) {
  const items = Array.isArray(value) ? value : []

  function update(i: number, v: string) {
    const next = items.slice()
    next[i] = v
    onChange(next)
  }
  function add() { onChange([...items, '']) }
  function remove(i: number) {
    const next = items.slice()
    next.splice(i, 1)
    onChange(next)
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}</span>
        <button type="button" style={btn} onClick={add}>+ Add</button>
      </div>
      <div style={list}>
        {items.map((s, i) => (
          <div key={i} style={row}>
            <input
              style={input}
              value={s}
              placeholder={itemPlaceholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button type="button" style={iconBtn} onClick={() => remove(i)}>×</button>
          </div>
        ))}
        {items.length === 0 && <div style={empty}>No items yet — click + Add.</div>}
      </div>
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)', flex: 1 }
const btn: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const list: React.CSSProperties = { display: 'grid', gap: 8 }
const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const input: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.18)', fontSize: 14, background: '#fff', color: '#2A2118' }
const iconBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid rgba(42,33,24,0.15)', cursor: 'pointer', fontSize: 14 }
const empty: React.CSSProperties = { padding: 14, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed rgba(42,33,24,0.2)', borderRadius: 10 }
const hlp: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
