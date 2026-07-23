'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './CinematicCtaText.module.css'

type Props = {
  /** Texts to rotate through. Index 0 is the resting/primary label. */
  texts: string[]
  /** Milliseconds each text stays visible before flipping. */
  intervalMs?: number
  /** When true, stop rotating and settle back on the primary (index 0) text. */
  paused?: boolean
}

/**
 * Departure-board style 3D text flip for the marketing CTA label. Rotates
 * through `texts` on a timer; `paused` freezes it on the primary label (used on
 * hover so the actionable "Beli Undangan" is what gets clicked). Respects
 * prefers-reduced-motion by staying static on the primary text. Purely visual —
 * the surrounding <button> owns the click handler and aria-label.
 */
export function CinematicCtaText({ texts, intervalMs = 3000, paused = false }: Props) {
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Longest text reserves the width so the pill never resizes between flips.
  const longest = texts.reduce((a, b) => (b.length > a.length ? b : a), '')

  useEffect(() => {
    if (paused || texts.length < 2) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    timerRef.current = setInterval(() => {
      setIndex((i) => {
        setPrev(i)
        return (i + 1) % texts.length
      })
    }, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, intervalMs, texts.length])

  // On hover-pause, flip back to the primary label.
  useEffect(() => {
    if (paused) {
      setIndex((i) => {
        if (i !== 0) setPrev(i)
        return 0
      })
    }
  }, [paused])

  // Once a flip settles, release the "leaving" layer back to its idle resting
  // pose (below the slot) so the next entrance always comes from the same side.
  useEffect(() => {
    if (prev === null) return
    const id = setTimeout(() => setPrev(null), 650)
    return () => clearTimeout(id)
  }, [prev, index])

  return (
    <span className={styles.flip}>
      <span className={styles.sizer} aria-hidden="true">
        {longest}
      </span>
      {texts.map((text, i) => {
        const state = i === index ? 'current' : i === prev ? 'leaving' : 'idle'
        return (
          <span key={i} className={styles.layer} data-state={state} aria-hidden="true">
            {text}
          </span>
        )
      })}
    </span>
  )
}
