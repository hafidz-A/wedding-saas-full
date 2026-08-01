'use client'

import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionEntry } from './EditorProvider'
import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import Switch from '@/components/ui/Switch'
import styles from './EditorRoot.module.css'

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
  /** True for types that collect guest data (RSVP/Gift) — disabling them
   *  prompts a confirm dialog so nobody hides a live form by accident. */
  confirmDisable?: boolean
}

export default function SectionRow({ section, label, isSelected, onSelect, onToggleEnabled, onRemove, draggable = true, canRemove = true, canDisable = true, confirmDisable = false }: Props) {
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
  // undefined means enabled — never compare with `=== true`.
  const isOn = section.enabled !== false

  async function handleToggle() {
    // Turning ON never confirms — only OFF, and only for data-collecting types.
    if (isOn && confirmDisable) {
      const ok = await confirmDialog({ message: t.disableDataConfirm, tone: 'danger' })
      if (!ok) return
    }
    onToggleEnabled()
  }

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
    <div ref={setNodeRef} style={style} className={styles.rowItem} onClick={onSelect}>
      <span
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: draggable ? 'grab' : 'not-allowed',
          color: draggable ? 'var(--text-primary)' : 'var(--text-disabled)',
          fontSize: 16,
          padding: '8px 10px',
          margin: '-4px 0 -4px -4px',
          opacity: draggable ? 0.8 : 0.4,
          touchAction: draggable ? 'none' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
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
      <span style={isOn ? statusLabelOn : statusLabelOff} onClick={(e) => e.stopPropagation()}>
        {isOn ? t.statusOn : t.statusOff}
      </span>
      <Switch
        checked={isOn}
        onChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={!canDisable}
        label={canDisable ? (isOn ? t.disableTitle : t.enableTitle) : t.lockedAlwaysOn}
        title={canDisable ? (isOn ? t.disableTitle : t.enableTitle) : t.lockedAlwaysOn}
      />
      {canRemove && (
        <button
          type="button"
          onClick={async (e) => { e.stopPropagation(); if (await confirmDialog({ message: `${t.removeConfirmPrefix}"${displayLabel}"${t.removeConfirmSuffix}`, tone: 'danger' })) onRemove() }}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-disabled)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
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

// Fixed minWidth so every row's switch lines up in a column regardless of
// whether the label reads "on" or "off". --color-emerald measures under the
// 4.5:1 AA floor as TEXT (it was designed as a fill) — --status-success-text
// is the darker variant made for on-surface text; the switch track keeps
// --color-emerald.
const statusLabelBase: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  textAlign: 'right',
  flexShrink: 0,
  minWidth: 58,
}
const statusLabelOn: React.CSSProperties = { ...statusLabelBase, color: 'var(--status-success-text)' }
const statusLabelOff: React.CSSProperties = { ...statusLabelBase, color: 'var(--text-muted)' }
