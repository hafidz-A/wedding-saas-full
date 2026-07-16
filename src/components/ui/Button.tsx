'use client'

import React, { forwardRef, type ButtonHTMLAttributes } from 'react'
import styles from './controls.module.css'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'ghostDanger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
  ghostDanger: styles.ghostDanger,
}
const sizeClass: Record<ButtonSize, string> = { sm: styles.sm, md: styles.md }

/**
 * Shared pill button — one interaction-state matrix (hover/active/disabled/
 * focus-visible + prefers-reduced-motion) for every surface. Defaults to
 * type="button" so it never accidentally submits a form.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', type = 'button', className, ...rest },
  ref,
) {
  const cls = [styles.btn, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(' ')
  return <button ref={ref} type={type} className={cls} {...rest} />
})
