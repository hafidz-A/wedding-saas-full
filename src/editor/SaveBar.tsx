'use client'

import { useEffect, useRef } from 'react'
import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'

/**
 * Status + publish + save controls. Stateless about publish/conflict — those
 * live in EditorProvider so a top and a bottom SaveBar render the same thing.
 * Can be rendered more than once.
 */
export default function SaveBar() {
  const t = useDashboardDict().editor
  const {
    isDirty, isSaving, saveError, save, lastSavedAt,
    isPublished, publishBusy, publishError, togglePublish,
  } = useEditor()

  return (
    <div style={wrap}>
      <div style={status}>
        {isSaving ? (
          <span style={savingTxt}>{t.saving}</span>
        ) : isDirty ? (
          <span style={dirtyTxt}>{t.unsaved}</span>
        ) : lastSavedAt ? (
          <span style={savedTxt}>{t.savedPrefix} {new Date(lastSavedAt).toLocaleTimeString()}</span>
        ) : (
          <span style={savedTxt}>{t.upToDate}</span>
        )}
        {saveError && <span style={errTxt}>{saveError}</span>}
        {publishError && <span style={errTxt}>{publishError}</span>}
      </div>

      <button
        type="button"
        disabled={publishBusy}
        onClick={togglePublish}
        style={isPublished ? pillOn : pillOff}
      >
        {isPublished ? t.published : t.draft}
      </button>

      <button
        type="button"
        disabled={!isDirty || isSaving}
        onClick={save}
        style={{ ...saveBtn, opacity: !isDirty || isSaving ? 0.4 : 1, cursor: !isDirty || isSaving ? 'default' : 'pointer' }}
      >
        {t.save}
      </button>
    </div>
  )
}

/**
 * Watches for a 409 save conflict and shows ONE reload dialog. Mounted once
 * (in EditorRoot), separate from SaveBar which may render multiple times.
 */
export function SaveConflictDialog() {
  const { saveConflict, clearSaveConflict } = useEditor()
  const t = useDashboardDict().editor
  const confirmDialog = useConfirm()
  const firing = useRef(false)

  useEffect(() => {
    if (!saveConflict || firing.current) return
    firing.current = true
    void (async () => {
      const reload = await confirmDialog({
        title: t.conflictTitle,
        message: t.conflictBody,
        confirmLabel: t.conflictReload,
        cancelLabel: t.conflictDismiss,
        tone: 'danger',
      })
      clearSaveConflict()
      firing.current = false
      if (reload) window.location.reload()
    })()
  }, [saveConflict, confirmDialog, clearSaveConflict, t])

  return null
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const status: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }
const dirtyTxt: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)' }
const savedTxt: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }
const savingTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const errTxt:   React.CSSProperties = { fontSize: 11, color: 'var(--interactive-primary)' }
const pillOn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--color-emerald)', color: '#fff', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const pillOff: React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'rgba(42,33,24,0.15)', color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const saveBtn: React.CSSProperties = { padding: '10px 22px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none' }
