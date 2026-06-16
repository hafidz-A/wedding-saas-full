'use client'

import { useEffect, type ReactNode } from 'react'
import styles from './EditorRoot.module.css'

/**
 * Bottom-sheet popup that hosts the FieldEditor on mobile. On small screens the
 * inline side pane is off-screen below the section strip, so tapping a section
 * "did nothing" — this surfaces the editor as a sheet instead. Desktop never
 * renders it (EditorRoot gates on useIsMobile).
 */
export default function FieldEditorSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
}) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.sheetScrim} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <span className={styles.sheetHandle} aria-hidden />
        <header className={styles.sheetHeader}>
          <span>{title}</span>
          <button type="button" onClick={onClose} className={styles.sheetClose} aria-label={closeLabel}>
            ×
          </button>
        </header>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  )
}
