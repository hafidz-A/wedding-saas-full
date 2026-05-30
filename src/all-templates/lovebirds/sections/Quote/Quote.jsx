'use client'

import QuoteBlock from '../../blocks/QuoteBlock.jsx'
import styles from './Quote.module.css'

/**
 * Quote / verse section (lovebirds). A thin wrapper around the existing
 * QuoteBlock primitive — net-new file, no Vite-divergence concern. Used as the
 * default section #2 (replacing the redundant standalone countdown).
 */
export default function Quote({ text, attribution }) {
  if (!text) return null
  return (
    <section className={styles.quote}>
      <div className={styles.inner}>
        <QuoteBlock text={text} attribution={attribution} />
      </div>
    </section>
  )
}
