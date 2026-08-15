'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import { staticAsset } from '@/lib/assets/staticAsset.js'
import styles from './EmotionalHook.module.css'

export function EmotionalHook({ t }: { t: Dict['landing']['emotionalHook'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  })
  const watermarkY = useTransform(scrollYProgress, [0, 1], [-50, 50])

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.ambient} aria-hidden="true">
        <div className={styles.wash} />
      </div>

      {/* Parallax Couple Silhouette Watermark */}
      <motion.div
        className={styles.watermark}
        style={{ y: watermarkY, opacity: revealed ? 0.08 : 0 }}
        aria-hidden="true"
      >
        <img src={staticAsset('/images/couple_silhouette.webp')} alt="" />
      </motion.div>

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <div className={styles.ornament} aria-hidden="true">
          <svg viewBox="0 0 100 20" className={styles.line}>
            <path d="M0 10 Q25 0, 50 10 T100 10" fill="none" stroke="#C89A1F" strokeWidth="0.8" opacity="0.4" />
            <circle cx="50" cy="10" r="2.5" fill="#E8553E" />
          </svg>
        </div>

        <h2 className={styles.title}>
          {t.title.split(' ').map((word, i) => (
            <span key={i} className="reveal-word" style={{ transitionDelay: `${i * 0.05}s` }}>
              {word}&nbsp;
            </span>
          ))}
        </h2>

        <p className={styles.body}>
          {t.body.split(' ').map((word, i) => (
            <span key={i} className="reveal-word" style={{ transitionDelay: `${(i + t.title.split(' ').length) * 0.04}s` }}>
              {word}&nbsp;
            </span>
          ))}
        </p>

        <div className={styles.ornament} aria-hidden="true">
          <svg viewBox="0 0 100 20" className={styles.line}>
            <path d="M0 10 Q25 20, 50 10 T100 10" fill="none" stroke="#2D8C4E" strokeWidth="0.8" opacity="0.3" />
            <circle cx="50" cy="10" r="2" fill="#C89A1F" />
          </svg>
        </div>
      </div>
    </section>
  )
}
