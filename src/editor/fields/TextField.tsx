'use client'

import styles from './fields.module.css'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

export default function TextField({ label, value, onChange, help }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={styles.control}
      />
      {help && (
        <span className={styles.help}>
          <span aria-hidden className={styles.infoIcon}>i</span>
          <span>{help}</span>
        </span>
      )}
    </label>
  )
}
