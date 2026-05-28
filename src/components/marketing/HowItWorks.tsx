'use client'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './HowItWorks.module.css'

export function HowItWorks({ t }: { t: Dict['landing']['howItWorks'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <h2 className={styles.heading}>{t.heading}</h2>
        <ol className={styles.steps}>
          {t.steps.map((step, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.num}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
