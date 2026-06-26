'use client'

import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionEntry } from './EditorProvider'
import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'

interface Props {
  section: SectionEntry
  label: string
  isSelected: boolean
  onSelect: () => void
  onToggleEnabled: () => void
  onRemove: () => void
  draggable?: boolean
  canRemove?: boolean
  canDisable?: boolean
}

export default function SectionRow({ section, label, isSelected, onSelect, onToggleEnabled, onRemove, draggable = true, canRemove = true, canDisable = true }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const { renameSectionNav } = useEditor()
  const t = useDashboardDict().editor
  const confirmDialog = useConfirm()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.navLabel || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  // Reset draft when section's saved navLabel changes externally.
  useEffect(() => {
    setDraft(section.navLabel || '')
  }, [section.navLabel])

  const displayLabel = section.navLabel || label
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).slice(0, 4).length : 0

  function commit() {
    renameSectionNav(section.id, draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(section.navLabel || '')
    setEditing(false)
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: isSelected ? 'rgba(232,85,62,0.10)' : 'transparent',
    border: isSelected ? '1px solid rgba(232,85,62,0.45)' : '1px solid transparent',
    cursor: 'pointer',
  }

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}>
      <span
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: draggable ? 'grab' : 'not-allowed', color: 'rgba(42,33,24,0.4)', fontSize: 14, padding: '0 4px', opacity: draggable ? 1 : 0.5 }}
        aria-label={draggable ? t.dragReorder : t.lockedHint}
        title={draggable ? t.dragReorder : t.lockedHint}
      >
        {draggable ? '⠿' : '🔒'}
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit() }
              if (e.key === 'Escape') { e.preventDefault(); cancel() }
            }}
            placeholder={label}
            maxLength={40}
            style={renameInput}
          />
        ) : (
          <span style={nameStyle} title={displayLabel}>{displayLabel}</span>
        )}
        <span style={typeStyle}>
          {editing
            ? `${wordCount}${t.renameHint}`
            : section.navLabel
              ? <span style={{ color: 'rgba(42,33,24,0.45)' }}>({label})</span>
              : null}
        </span>
      </div>

      {!editing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
          title={t.renameTitle}
          style={iconBtn}
          aria-label={t.renameAria}
        >
          ✏️
        </button>
      )}
      {canDisable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleEnabled() }}
          title={section.enabled === false ? t.enableTitle : t.disableTitle}
          style={{
            width: 12, height: 12, borderRadius: 'var(--radius-pill)',
            border: 'none', cursor: 'pointer',
            background: section.enabled === false ? 'rgba(42,33,24,0.18)' : 'var(--color-emerald)',
            flexShrink: 0,
          }}
        />
      )}
      {canRemove && (
        <button
          type="button"
          onClick={async (e) => { e.stopPropagation(); if (await confirmDialog({ message: `${t.removeConfirmPrefix}"${displayLabel}"${t.removeConfirmSuffix}`, tone: 'danger' })) onRemove() }}
          style={{ border: 'none', background: 'transparent', color: 'rgba(42,33,24,0.4)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
          aria-label={t.removeAria}
        >
          ×
        </button>
      )}
    </div>
  )
}

const nameStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const typeStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(42,33,24,0.5)',
  letterSpacing: '0.04em',
}

const renameInput: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(232,85,62,0.4)',
  background: 'var(--surface-raised)',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
}

const iconBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  padding: '2px 4px',
  opacity: 0.55,
  flexShrink: 0,
}
