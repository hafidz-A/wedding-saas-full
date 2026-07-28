'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './FinalCta.module.css'
import cta from './cta.module.css'

export function FinalCta({ t }: { t: Dict['landing']['finalCta'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()

  return (
    <section className={styles.section} ref={ref}>
      <div className={`${styles.panel} ${revealed ? styles.revealed : ''}`}>
        {/* Background Ambient Layers */}
        <div className={styles.washes} aria-hidden="true">
          <div className={styles.wash1} />
          <div className={styles.wash2} />
        </div>

        {/* Floating Ornaments */}
        <div className={styles.ornaments} aria-hidden="true">
          <svg className={`${styles.petal} ${styles.petal1}`} viewBox="0 0 100 100">
            <path d="M50 20 C65 30 70 45 50 80 C30 45 35 30 50 20 Z" fill="#E8553E" opacity="0.25" />
          </svg>
          <svg className={`${styles.petal} ${styles.petal2}`} viewBox="0 0 100 100">
            <ellipse cx="50" cy="50" rx="10" ry="22" fill="#F5C842" transform="rotate(30 50 50)" opacity="0.3" />
          </svg>
        </div>

        <div className={styles.content}>
          <motion.h2 
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            animate={revealed ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.title}
          </motion.h2>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={revealed ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.0, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={revealed ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/#vibe" className={cta.cta}>
              {t.cta}
              <span className={cta.arrow}>↓</span>
            </Link>
            <p className={styles.reassure}>
              {t.reassure.split('·').map((clause, i) => (
                <span key={i} className={styles.reassureClause}>{clause.trim()}</span>
              ))}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
