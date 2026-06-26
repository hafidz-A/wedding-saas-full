'use client'

import { useState } from 'react'
import { localizeLabel, type FieldDef } from '../schemas/types'
import TextField from './TextField'
import TextareaField from './TextareaField'
import DatetimeField from './DatetimeField'
import BooleanField from './BooleanField'
import SelectField from './SelectField'
import ImageField from './ImageField'
import ImageArrayField from './ImageArrayField'
import StringArrayField from './StringArrayField'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import ctrl from '@/app/[template]/[slug]/dashboard/dashboardControls.module.css'
import type { Lang } from '@/lib/i18n'

interface Props {
  label: string
  value: Record<string, unknown>[]
  itemFields: FieldDef[]
  newItem: Record<string, unknown>
  itemLabelKey?: string
  slug: string
  lang: Lang
  onChange: (next: Record<string, unknown>[]) => void
  maxItems?: number
}

// Date.now() alone collides on fast double-clicks → duplicate React keys →
// rows render/remove erratically. Add a random suffix so every id is unique.
function newItemId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export default function ObjectArrayField({
  label, value, itemFields, newItem, itemLabelKey, slug, lang, onChange, maxItems,
}: Props) {
  const t = useDashboardDict().editor
  const confirmDialog = useConfirm()
  const items = Array.isArray(value) ? value : []
  const [openIdx, setOpenIdx] = useState<number | null>(items.length === 1 ? 0 : null)
  const atMax = maxItems != null && items.length >= maxItems

  function add() {
    if (atMax) return
    const next = [...items, { ...newItem, id: newItemId() }]
    onChange(next)
    setOpenIdx(next.length - 1)
  }

  async function remove(idx: number) {
    if (!(await confirmDialog({ message: t.removeItemConfirm, tone: 'danger' }))) return
    const next = items.slice()
    next.splice(idx, 1)
    onChange(next)
    setOpenIdx(null)
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    const [it] = next.splice(idx, 1)
    next.splice(j, 0, it)
    onChange(next)
    setOpenIdx(j)
  }

  function updateItem(idx: number, key: string, val: unknown) {
    const next = items.slice()
    next[idx] = { ...next[idx], [key]: val }
    onChange(next)
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}{maxItems != null && <span style={count}> {items.length}/{maxItems}</span>}</span>
        <button type="button" className={ctrl.btnAdd} onClick={add} disabled={atMax}>{t.addItem}</button>
      </div>
      {atMax && <span style={hint}>{t.maxItemsFull.replace('{max}', String(maxItems))}</span>}

      <div style={list}>
        {items.map((item, i) => {
          const headerLabel = (itemLabelKey && String(item[itemLabelKey] ?? '')) || `${t.itemFallback} ${i + 1}`
          const open = openIdx === i
          return (
            <div key={String((item as any).id ?? i)} style={card}>
              <div style={rowHead} onClick={() => setOpenIdx(open ? null : i)}>
                <span style={chev}>{open ? '▾' : '▸'}</span>
                <span style={rowLbl}>{headerLabel || `${t.itemFallback} ${i + 1}`}</span>
                <div style={rowBtns} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={ctrl.iconBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className={ctrl.iconBtn} onClick={() => move(i, +1)} disabled={i === items.length - 1}>↓</button>
                  <button type="button" className={ctrl.iconBtn} onClick={() => remove(i)}>×</button>
                </div>
              </div>
              {open && (
                <div style={body}>
                  {itemFields.map((f) => {
                    const v = (item[f.key] as any) ?? defaultForField(f)
                    const onChange = (val: unknown) => updateItem(i, f.key, val)
                    const fLabel = localizeLabel(f.label, lang)
                    const fHelp = f.help ? localizeLabel(f.help, lang) : undefined
                    switch (f.type) {
                      case 'text':     return <TextField     key={f.key} label={fLabel} value={v} onChange={onChange} help={fHelp} />
                      case 'textarea': return <TextareaField key={f.key} label={fLabel} value={v} rows={f.rows} onChange={onChange} help={fHelp} />
                      case 'datetime': return <DatetimeField key={f.key} label={fLabel} value={v} onChange={onChange} help={fHelp} />
                      case 'boolean':  return <BooleanField  key={f.key} label={fLabel} value={v} onChange={onChange} help={fHelp} />
                      case 'select':   return <SelectField   key={f.key} label={fLabel} value={v} options={f.options.map((o) => ({ value: o.value, label: localizeLabel(o.label, lang) }))} onChange={onChange} help={fHelp} />
                      case 'image':    return <ImageField    key={f.key} label={fLabel} value={v} slug={slug} onChange={onChange} help={fHelp} />
                      case 'imageArray':  return <ImageArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} slug={slug} onChange={onChange} help={fHelp} maxItems={f.maxItems} />
                      case 'stringArray': return <StringArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} itemPlaceholder={f.itemPlaceholder} onChange={onChange} help={fHelp} />
                      case 'objectArray': return <ObjectArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} itemFields={f.itemFields} newItem={f.newItem} itemLabelKey={f.itemLabelKey} slug={slug} lang={lang} onChange={onChange} maxItems={f.maxItems} />
                      default:
                        return <div key={f.key} style={{ fontSize: 12, color: 'var(--interactive-primary)' }}>{t.unsupportedField} {f.type}</div>
                    }
                  })}
                </div>
              )}
            </div>
          )
        })}
        {items.length === 0 && <div style={empty}>{t.noItems}</div>}
      </div>
    </div>
  )
}

function defaultForField(f: FieldDef): unknown {
  switch (f.type) {
    case 'boolean': return false
    case 'text':
    case 'textarea':
    case 'datetime':
    case 'select':
    case 'image': return ''
    default: return ''
  }
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', flex: 1 }
const count:React.CSSProperties = { letterSpacing: '0.06em', color: 'rgba(42,33,24,0.45)' }
const hint: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
const list: React.CSSProperties = { display: 'grid', gap: 8 }
const card: React.CSSProperties = { border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)' }
const rowHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }
const chev: React.CSSProperties = { color: 'rgba(42,33,24,0.5)', width: 14 }
const rowLbl: React.CSSProperties = { flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowBtns: React.CSSProperties = { display: 'flex', gap: 4 }
const body: React.CSSProperties = { display: 'grid', gap: 14, padding: '4px 14px 16px', borderTop: '1px solid var(--border-subtle)' }
const empty:React.CSSProperties = { padding: 18, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }
