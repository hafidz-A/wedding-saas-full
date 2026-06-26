'use client'

import styles from './fields.module.css'

interface Props {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  help?: string
}

export default function SelectField({ label, value, options, onChange, help }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={styles.control}
      >
        {(value === '' || value == null) && <option value="">— select —</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && <span className={styles.help}>{help}</span>}
    </label>
  )
}
