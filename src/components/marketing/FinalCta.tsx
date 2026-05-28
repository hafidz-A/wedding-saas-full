'use client'
import Link from 'next/link'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './FinalCta.module.css'

export function FinalCta({ t }: { t: Dict['landing']['finalCta'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.section}>
      <div className={`${styles.panel} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <h2 className={styles.title}>{t.title}</h2>
        <p className={styles.subtitle}>{t.subtitle}</p>
        <Link href="/signup" className={styles.cta}>{t.cta}</Link>
      </div>
    </section>
  )
}
