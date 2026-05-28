'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Reveals an element on scroll-in. App-level + template-agnostic — do NOT
 * import the Lovebirds-scoped useScrollReveal here (keeps marketing decoupled
 * from any single template). Reduced-motion is handled globally in CSS.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -50px 0px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { ref, revealed }
}
