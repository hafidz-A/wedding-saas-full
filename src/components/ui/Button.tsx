'use client'

import React, { forwardRef, type ButtonHTMLAttributes, type ComponentPropsWithoutRef } from 'react'
import Link from 'next/link'
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

export interface ButtonLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * Link styled as the shared Button — for navigations that look like actions
 * (auth "continue" links, admin "Lihat"). Same classes, same state matrix.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', className, ...rest },
  ref,
) {
  const cls = [styles.btn, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(' ')
  return <Link ref={ref} className={cls} {...rest} />
})
