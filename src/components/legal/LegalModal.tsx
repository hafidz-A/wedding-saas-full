'use client'

import { useEffect, type ReactNode } from 'react'
import styles from './legal.module.css'

/**
 * Lightweight centered modal for reading a legal document (Privacy / Refund)
 * without leaving the signup form. Follows the codebase's overlay+dialog
 * inline-style pattern (see dashboard GuestImportModal): click the backdrop or
 * the × to close, Esc also closes. The body scrolls when the document is long
 * and reuses the `.prose` typography from legal.module.css so it matches the
 * standalone /privacy and /refund pages.
 */
export default function LegalModal({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}) {
  // Esc to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={header}>
          <h2 style={titleStyle}>{title}</h2>
          <button type="button" onClick={onClose} style={closeBtn} aria-label={closeLabel}>
            ×
          </button>
        </header>
        <div style={body} className={styles.prose}>
          {children}
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--text-muted)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  zIndex: 1000,
}
const dialog: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#FFFDF8',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 30px 80px rgba(42,33,24,0.30)',
  fontFamily: 'var(--font-body, system-ui)',
  color: 'var(--text-primary)',
}
const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '20px 24px',
  borderBottom: '1px solid var(--border-default)',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontStyle: 'normal',
  fontSize: 24,
  margin: 0,
}
const closeBtn: React.CSSProperties = {
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border-default)',
  background: 'transparent',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  color: 'var(--text-primary)',
}
const body: React.CSSProperties = {
  overflowY: 'auto',
  padding: '20px 24px 28px',
  fontSize: 14.5,
  lineHeight: 1.7,
}
