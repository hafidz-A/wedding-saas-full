'use client'

import styles from './fields.module.css'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  help?: string
}

export default function TextareaField({ label, value, onChange, rows = 3, help }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.control} ${styles.controlTextarea}`}
      />
      {help && <span className={styles.help}>{help}</span>}
    </label>
  )
}
