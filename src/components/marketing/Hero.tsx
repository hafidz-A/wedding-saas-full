'use client'
import Link from 'next/link'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Hero.module.css'

export function Hero({ t }: { t: Dict['landing']['hero'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.hero}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <div className={styles.actions}>
            <Link href="/signup" className={styles.primary}>{t.ctaPrimary}</Link>
            <Link href="/templates" className={styles.secondary}>{t.ctaSecondary}</Link>
          </div>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.phone}>
            <div className={styles.phoneCard}>
              <span className={styles.phoneScript}>The Wedding of</span>
              <span className={styles.phoneNames}>Amara &amp; Rizky</span>
              <span className={styles.phoneDate}>11 · 15 · 2026</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
