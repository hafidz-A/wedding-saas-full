'use client'

import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Testimonials.module.css'

export function Testimonials({ t }: { t: Dict['landing']['testimonials'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.ambient} aria-hidden="true">
        <div className={styles.wash} />
      </div>

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>TESTIMONIALS</span>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>

        <div className={styles.grid}>
          {t.items.map((item, i) => (
            <motion.article 
              key={i} 
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              animate={revealed ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={styles.quoteMark}>“</span>
              <blockquote className={styles.quote}>{item.quote}</blockquote>
              <footer className={styles.cardFooter}>
                <div className={styles.authorGroup}>
                  <div className={styles.monogram}>
                    {item.author.split('&')[0].trim().charAt(0)}
                    {item.author.split('&')[1]?.trim().charAt(0)}
                  </div>
                  <div className={styles.authorInfo}>
                    <cite className={styles.author}>{item.author}</cite>
                    <span className={styles.plan}>{item.plan}</span>
                  </div>
                </div>
              </footer>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
