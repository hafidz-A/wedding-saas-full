'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import StoryCard from './StoryCard.jsx'
import styles from './OurStory.module.css'

/**
 * The pinned scrollytelling stage.
 *
 *   .section is tall (set inline in OurStory.jsx)
 *   .pinned is sticky inside it — visually pinned for the whole scroll
 *   each StoryCard absolutely fills the stage and fades between based on `progress`
 *   indicator strips fill left → right showing the current story
 *
 * Progress is tracked manually via getBoundingClientRect + rAF throttling —
 * this is bulletproof for very-tall sections containing a sticky child,
 * and matches the proven pattern used in the Hero gate.
 */
export default function StoryPinnedScene({ title, stories, sectionRef }) {
  const progress = useMotionValue(0)

  useEffect(() => {
    let raf = 0
    const clamp01 = (v) => Math.max(0, Math.min(1, v))
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      progress.set(total > 0 ? clamp01(scrolled / total) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [progress, sectionRef])

  return (
    <div className={styles.pinned}>
      <div className={styles.titleWrap}>
        <span className={styles.eyebrow}>Our journey</span>
        <h2 className={styles.title}>{title}</h2>
      </div>

      <div className={styles.stage}>
        {stories.map((story, i) => (
          <StoryCard
            key={story.id || i}
            story={story}
            index={i}
            total={stories.length}
            progress={progress}
          />
        ))}
      </div>

      <ProgressIndicator total={stories.length} progress={progress} />
    </div>
  )
}

function ProgressIndicator({ total, progress }) {
  return (
    <div className={styles.indicator} aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <IndicatorDot key={i} index={i} total={total} progress={progress} />
      ))}
    </div>
  )
}

function IndicatorDot({ index, total, progress }) {
  const slot = 1 / total
  const start = index * slot
  const end = (index + 1) * slot
  const fill = useTransform(progress, [start, end - slot * 0.1], [0, 1], { clamp: true })

  return (
    <span className={styles.indicatorDot}>
      <motion.span className={styles.indicatorFill} style={{ scaleX: fill }} />
    </span>
  )
}
