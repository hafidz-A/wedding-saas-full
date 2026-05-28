'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

/**
 * Call-to-action button. Renders an anchor (or button) styled as a pill.
 *
 *   variant: 'primary' | 'secondary' | 'ghost'
 *   align:   'left' | 'center' | 'right'
 */
export default function CTAButtonBlock({
  label,
  href,
  onClick,
  variant = 'primary',
  align = 'center',
  reveal = true,
}) {
  const className = `${styles.cta} ${styles[`cta-${variant}`] || ''} ${styles[`cta-align-${align}`] || ''}`

  const button = href ? (
    <a className={className} href={href}>
      {label}
    </a>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  )

  const wrap = (
    <div style={{ display: 'flex', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
      {button}
    </div>
  )

  return reveal ? <AnimatedReveal direction="up">{wrap}</AnimatedReveal> : wrap
}
