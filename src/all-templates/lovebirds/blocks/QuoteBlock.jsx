'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

export default function QuoteBlock({ text, attribution, reveal = true }) {
  const content = (
    <blockquote className={styles.quote}>
      <span className={styles.quoteMark} aria-hidden="true">&ldquo;</span>
      <p className={styles.quoteText}>{text}</p>
      {attribution && <cite className={styles.quoteAttribution}>— {attribution}</cite>}
    </blockquote>
  )
  return reveal ? <AnimatedReveal direction="up">{content}</AnimatedReveal> : content
}
