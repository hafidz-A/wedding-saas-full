'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

/**
 * Composable text block — any combination of eyebrow / title / subtitle / body.
 * Aligns left/center/right via `align`.
 */
export default function TextBlock({
  eyebrow,
  title,
  subtitle,
  body,
  align = 'center',
  reveal = true,
}) {
  const content = (
    <div className={`${styles.text} ${styles[`align-${align}`]}`}>
      {eyebrow && <p className={styles.textEyebrow}>{eyebrow}</p>}
      {title && <h2 className={styles.textTitle}>{title}</h2>}
      {subtitle && <p className={styles.textSubtitle}>{subtitle}</p>}
      {body && <p className={styles.textBody}>{body}</p>}
    </div>
  )

  return reveal ? <AnimatedReveal direction="up">{content}</AnimatedReveal> : content
}
