'use client'

import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './HowItWorks.module.css'

export function HowItWorks({ t }: { t: Dict['landing']['howItWorks'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()

  return (
    <section className={styles.section} ref={ref}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>THE JOURNEY</span>
          <h2 className={styles.heading}>{t.heading}</h2>
        </header>

        <div className={styles.stepsContainer}>
          {/* Connecting Line Track */}
          <div className={styles.timelineTrack}>
            <motion.div
              className={styles.timelineProgress}
              initial={{ height: 0 }}
              animate={revealed ? { height: '100%' } : {}}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
            />
          </div>

          <ol className={styles.steps}>
            {t.steps.map((step, i) => (
              <motion.li 
                key={i} 
                className={styles.step}
                initial={{ opacity: 0, y: 30 }}
                animate={revealed ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: i * 0.35 + 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Timeline Node Badge */}
                <div className={styles.node}>
                  <span className={styles.num}>{i + 1}</span>
                  <div className={styles.nodePulse} />
                </div>

                <div className={styles.content}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
