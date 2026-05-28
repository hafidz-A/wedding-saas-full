'use client'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Features.module.css'

export function Features({ t }: { t: Dict['landing']['features'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section id="features" className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <header className={styles.head}>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>
        <div className={styles.grid}>
          {t.items.map((item, i) => (
            <article key={i} className={styles.card}>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
