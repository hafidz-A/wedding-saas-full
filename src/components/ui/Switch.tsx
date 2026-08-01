'use client'

import React from 'react'
import styles from './Switch.module.css'

export interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  /** Accessible name for the switch (there's no visible <label> element). */
  label?: string
  title?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

/**
 * Shared on/off switch. A `role="switch"` button (not a checkbox input) so it
 * carries its own accessible name via `aria-label`/`title` — callers don't
 * need a wrapping <label>. The button itself is stretched to a 44px-min tap
 * target (WCAG 2.5.8), independent of the visually smaller 38x22 track.
 */
export default function Switch({ checked, onChange, disabled = false, label, title, onClick }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={styles.switch}
      onClick={(e) => {
        onClick?.(e)
        if (!disabled) onChange(!checked)
      }}
    >
      <span className={styles.track} data-checked={checked}>
        <span className={styles.knob} data-checked={checked} />
      </span>
    </button>
  )
}
