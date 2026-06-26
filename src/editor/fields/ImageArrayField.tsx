'use client'

import { useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUpload } from '../lib/useUpload'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'

interface Props {
  label: string
  value: string[]                            // array of URLs (we serialize as strings)
  onChange: (next: string[]) => void
  slug: string
  help?: string
  maxItems?: number
}

export default function ImageArrayField({ label, value, onChange, slug, help, maxItems }: Props) {
  const t = useDashboardDict().editor
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const items = Array.isArray(value) ? value : []
  const atMax = maxItems != null && items.length >= maxItems

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files || [])
    // Respect the cap even on a multi-file pick: only upload what still fits.
    if (maxItems != null) files = files.slice(0, Math.max(0, maxItems - items.length))
    if (files.length === 0) { e.target.value = ''; return }
    const urls: string[] = []
    for (const f of files) {
      const url = await upload(f)
      if (url) urls.push(url)
    }
    if (urls.length) {
      onChange([...items, ...urls])
      fb.ok(fm.imageUploaded)
    }
    if (urls.length < files.length) fb.fail(fm.uploadFail)
    e.target.value = ''
  }

  function remove(idx: number) {
    const next = items.slice()
    next.splice(idx, 1)
    onChange(next)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = Number(String(active.id).split(':')[0])
    const to = Number(String(over.id).split(':')[0])
    if (Number.isNaN(from) || Number.isNaN(to)) return
    onChange(arrayMove(items, from, to))
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}{maxItems != null && <span style={count}> {items.length}/{maxItems}</span>}</span>
        <button type="button" style={{ ...btn, opacity: atMax ? 0.45 : 1 }} disabled={isUploading || atMax} onClick={() => fileInput.current?.click()}>
          {isUploading ? 'Uploading…' : '+ Add'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          multiple
          onChange={onPick}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((url, i) => `${i}:${url}`)} strategy={rectSortingStrategy}>
          <div style={grid}>
            {items.map((url, i) => (
              <SortableTile key={`${i}:${url}`} id={`${i}:${url}`} url={url} onRemove={() => remove(i)} />
            ))}
            {items.length === 0 && <div style={empty}>No images yet — click + Add to upload.</div>}
          </div>
        </SortableContext>
      </DndContext>

      {atMax && <span style={hlp}>{t.maxItemsFull.replace('{max}', String(maxItems))}</span>}
      {error && <span style={errStyle}>{error}</span>}
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

function SortableTile({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    cursor: 'grab',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img src={url} alt="" style={tile} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        onPointerDown={(e) => e.stopPropagation()}
        style={removeBtn}
      >
        ×
      </button>
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', flex: 1 }
const count:React.CSSProperties = { letterSpacing: '0.06em', color: 'rgba(42,33,24,0.45)' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }
const tile: React.CSSProperties = { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'block' }
const removeBtn: React.CSSProperties = { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 'var(--radius-pill)', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: 14, lineHeight: 1, cursor: 'pointer' }
const btn:  React.CSSProperties = { padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const empty:React.CSSProperties = { gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }
const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)' }
