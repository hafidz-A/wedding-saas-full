'use client'

import styles from './LockedCoupleField.module.css'

interface Props {
  label: string
  value: string
  hint: string
  onUnlock: () => void
}

/**
 * A couple-linked field shown locked (read-only) because its value is managed
 * centrally in the Couple panel. Clicking/tapping asks for confirmation (handled
 * by the parent via onUnlock) before turning into a normal editable field. The
 * unlock hint shows on hover for pointer devices and is always visible on touch
 * (see the module CSS @media (hover) rules).
 */
export default function LockedCoupleField({ label, value, hint, onUnlock }: Props) {
  return (
    <div className={styles.wrap}>
      <span style={lbl}>{label}</span>
      <button type="button" className={styles.lockedBox} onClick={onUnlock} aria-label={`${label} — ${hint}`}>
        <span className={styles.value}>{value || '—'}</span>
        <span className={styles.badge} aria-hidden="true">🔒</span>
      </button>
      <span className={styles.hint}>{hint}</span>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
