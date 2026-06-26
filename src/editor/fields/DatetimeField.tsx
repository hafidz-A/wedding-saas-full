'use client'

import styles from './fields.module.css'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

/**
 * Stores ISO 8601 string (e.g. "2025-11-15T16:00:00"). Browser
 * datetime-local input uses "YYYY-MM-DDTHH:MM" — we strip seconds
 * from the stored value for display, then re-append ":00" on change.
 */
export default function DatetimeField({ label, value, onChange, help }: Props) {
  const local = typeof value === 'string' ? value.slice(0, 16) : ''
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : '')}
        className={styles.control}
      />
      {help && <span className={styles.help}>{help}</span>}
    </label>
  )
}
