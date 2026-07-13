'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './dashboard.module.css'

/**
 * Wraps the dashboard tab strip and adds coral scroll-arrow buttons at the
 * edges when the tabs overflow (narrow screens). The strip still scrolls by
 * touch/drag/wheel — the scrollbar is hidden — so the arrows are the explicit
 * affordance that there's more to see. Each arrow shows only while there is
 * room to scroll in that direction.
 */
export default function NavScroller({
  children,
  leftLabel,
  rightLabel,
}: {
  children: ReactNode
  leftLabel: string
  rightLabel: string
}) {
  const ref = useRef<HTMLElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    // max <= 1 → not overflowing at all, so both ends are "reached" (no arrows).
    setAtEnd(el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [measure])

  function nudge(dir: 1 | -1) {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const target = Math.max(0, Math.min(max, el.scrollLeft + dir * Math.max(160, el.clientWidth * 0.7)))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.navWrap}>
      {!atStart && (
        <button
          type="button"
          className={`${styles.navArrow} ${styles.navArrowLeft}`}
          aria-label={leftLabel}
          onClick={() => nudge(-1)}
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
      <nav ref={ref} className={styles.nav}>
        {children}
      </nav>
      {!atEnd && (
        <button
          type="button"
          className={`${styles.navArrow} ${styles.navArrowRight}`}
          aria-label={rightLabel}
          onClick={() => nudge(1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  )
}
