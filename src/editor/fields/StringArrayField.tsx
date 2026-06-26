'use client'

import styles from './fields.module.css'
import ctrl from '@/app/[template]/[slug]/dashboard/dashboardControls.module.css'

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
        <button type="button" className={ctrl.btnAdd} onClick={add}>+ Add</button>
      </div>
      <div style={list}>
        {items.map((s, i) => (
          <div key={i} style={row}>
            <input
              className={`${styles.control} ${styles.controlFlex}`}
              value={s}
              placeholder={itemPlaceholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button type="button" className={ctrl.iconBtn} onClick={() => remove(i)}>×</button>
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
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', flex: 1 }
const list: React.CSSProperties = { display: 'grid', gap: 8 }
const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const empty: React.CSSProperties = { padding: 14, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }
const hlp: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
