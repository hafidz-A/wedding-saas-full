'use client'

import { useEffect, useRef, useState } from 'react'
import SectionBackground from '../../components/SectionBackground.jsx'
import StoryPinnedScene from './StoryPinnedScene.jsx'
import StoryStackedCard from './StoryStackedCard.jsx'
import styles from './OurStory.module.css'

const DEFAULTS = {
  title: 'Our Story',
  cards: [],
}

function useMatchMedia(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [query])
  return matches
}

export default function OurStory(props) {
  const { title, cards } = { ...DEFAULTS, ...props }
  const stories = Array.isArray(cards) ? cards : []
  const sectionRef = useRef(null)

  // Pinned scrollytelling is preserved for nearly all viewports — phones,
  // tablets, and desktop all get the cinematic experience. We only fall
  // back to the stacked layout on (a) the smallest phones (<= 480px),
  // where the pinned layout would be cramped, or (b) when the user has
  // requested reduced motion.
  const isVerySmall = useMatchMedia('(max-width: 480px)')
  const isMobile = useMatchMedia('(max-width: 760px)')
  const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)')
  const useStacked = isVerySmall || prefersReducedMotion

  // ──────────────────────────────────────────────────────────────────────
  //  SCROLL SENSITIVITY KNOB
  //  How much viewport-height of scroll one story consumes before the
  //  next one begins. Higher = less sensitive (more scroll per story).
  //  Mobile gets a smaller budget so the total page isn't insanely long
  //  to thumb through, while desktop keeps the slow cinematic pacing.
  // ──────────────────────────────────────────────────────────────────────
  const PER_STORY_VH = isMobile ? 90 : 140

  // Belt-and-braces height: also set inline (don't rely on CSS var resolution).
  const sectionStyle = useStacked
    ? { '--story-count': stories.length }
    : {
        '--story-count': stories.length,
        height: `calc(${stories.length * PER_STORY_VH}vh + 100vh)`,
      }

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${useStacked ? styles.stackedMode : styles.pinnedMode}`}
      style={sectionStyle}
      aria-label="Our Story"
    >
      <SectionBackground tone="warm" />
      <div className={styles.overlay} aria-hidden="true" />

      {useStacked ? (
        <div className={styles.stackedInner}>
          <header className={styles.titleWrap}>
            <span className={styles.eyebrow}>Our journey</span>
            <h2 className={styles.title}>{title}</h2>
          </header>
          <div className={styles.stackedList}>
            {stories.map((story, i) => (
              <StoryStackedCard key={story.id || i} story={story} />
            ))}
          </div>
        </div>
      ) : (
        <StoryPinnedScene title={title} stories={stories} sectionRef={sectionRef} />
      )}
    </section>
  )
}
