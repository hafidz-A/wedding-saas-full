'use client'

import styles from './fields.module.css'

interface Props {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  help?: string
}

export default function BooleanField({ label, value, onChange, help }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.checkBox}
        />
        <span className={styles.checkLabel}>{label}</span>
      </label>
      {help && <span className={styles.checkHelp}>{help}</span>}
    </div>
  )
}
