'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Reveals an element when it crosses an IntersectionObserver threshold.
 * Fires once, then disconnects. Defaults: 15% threshold, 0px rootMargin.
 *
 * With `once: false` it keeps observing and isVisible tracks the visible
 * FRACTION against the threshold (ratio >= threshold), not isIntersecting —
 * isIntersecting only turns false when the target is 100% off-screen, which
 * is far too late for exit animations (e.g. the Hero blast retract should
 * start while a sliver of the section is still showing).
 *
 * Returns { ref, isVisible }.
 */
export default function useScrollReveal({
  threshold = 0.15,
  rootMargin = '0px',
  once = true,
} = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return undefined
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      setIsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (once) {
            if (entry.isIntersecting) {
              setIsVisible(true)
              observer.unobserve(entry.target)
            }
          } else {
            setIsVisible(entry.intersectionRatio >= threshold)
          }
        })
      },
      {
        // Continuous mode needs callbacks just under AND over the target ratio
        // so the >= comparison lands deterministically on both crossings.
        threshold: once
          ? threshold
          : [Math.max(0, threshold - 0.01), Math.min(1, threshold + 0.01)],
        rootMargin,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, isVisible }
}
