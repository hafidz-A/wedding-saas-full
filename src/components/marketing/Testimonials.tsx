'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import type { PublicTestimonial } from '@/lib/testimonials/types'
import { useReveal } from '@/hooks/useReveal'
import styles from './Testimonials.module.css'

const INITIAL = 6

function Stars({ n }: { n: number }) {
  return (
    <div className={styles.stars} aria-label={`${n} dari 5 bintang`}>
      {'★★★★★'.split('').map((_, i) => (
        <span key={i} className={i < n ? styles.starOn : styles.starOff}>★</span>
      ))}
    </div>
  )
}

export function Testimonials({ t, items }: { t: Dict['landing']['testimonials']; items: PublicTestimonial[] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, INITIAL)
  const hasItems = items.length > 0

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.ambient} aria-hidden="true"><div className={styles.wash} /></div>

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>TESTIMONIALS</span>
          <h2 className={styles.heading}>{hasItems ? t.heading : t.emptyHeading}</h2>
          <p className={styles.subheading}>{hasItems ? t.subheading : t.emptyBody}</p>
        </header>

        {hasItems ? (
          <>
            <div className={styles.grid}>
              {shown.map((item, i) => (
                <motion.article
                  key={item.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 30 }}
                  animate={revealed ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.9, delay: (i % INITIAL) * 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Stars n={item.rating} />
                  <span className={styles.quoteMark}>“</span>
                  {/* Body: NEVER italic (global constraint). */}
                  <blockquote className={styles.quote}>{item.body}</blockquote>
                  <footer className={styles.cardFooter}>
                    <div className={styles.authorGroup}>
                      <div className={styles.monogram}>
                        {item.author.split('&')[0].trim().charAt(0)}
                        {item.author.split('&')[1]?.trim().charAt(0)}
                      </div>
                      <div className={styles.authorInfo}>
                        <cite className={styles.author}>{item.author}</cite>
                        <span className={styles.plan}>{item.templateId}</span>
                      </div>
                    </div>
                  </footer>
                </motion.article>
              ))}
            </div>
            {items.length > INITIAL && (
              <div className={styles.expandRow}>
                <button type="button" className={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Tampilkan lebih sedikit' : `Lihat lebih banyak (${items.length - INITIAL})`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <a href="/#vibe" className={styles.emptyCta}>{t.emptyCta}</a>
          </div>
        )}
      </div>
    </section>
  )
}
