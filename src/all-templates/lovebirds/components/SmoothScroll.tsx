'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth-scroll wrapper using Lenis.
 *
 * Mounts once at the top of the public invitation tree. Replaces the
 * browser's native scroll with an interpolated, frame-driven scroll —
 * the whole page feels like a single buttery flow instead of step-wise
 * wheel ticks.
 *
 * Integration notes:
 *   - Lenis hijacks window scroll (document mode). ScrollTrigger still
 *     reads window.scrollY, so pinned sections (GallerySpringCoil,
 *     Schedule) keep working as long as ScrollTrigger.update() runs on
 *     every Lenis tick — handled below via `lenis.on('scroll', ...)`.
 *   - rAF loop is driven by gsap.ticker so Lenis + GSAP timelines share
 *     one frame budget. Avoids two rAF loops fighting each other.
 *   - lagSmoothing(0) disables GSAP's catch-up on dropped frames, which
 *     would otherwise tear the smooth-scroll motion when the user tabs
 *     away & comes back.
 *   - Respects prefers-reduced-motion: if the user has it on, we don't
 *     instantiate Lenis at all — native scroll is the right choice.
 *   - Editor preview iframe also uses this since the iframe loads the
 *     public route. Smooth scroll inside the preview matches production.
 *
 * Renders nothing — just side effects.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const lenis = new Lenis({
      // Default 1.2 is the canonical "buttery" feel — matches the
      // sites people associate with Lenis (Studio Freight, Apple).
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Lenis touch hijacking is currently rough on phones (interferes
      // with section pinning + can break iOS rubber-band). Native touch
      // scroll is fine — keep wheel/trackpad smoothing only.
      syncTouch: false,
    })

    // Drive ScrollTrigger from Lenis ticks so pinned sections stay in
    // sync with the interpolated scroll position.
    lenis.on('scroll', ScrollTrigger.update)

    const rafCallback = (time: number) => {
      // gsap.ticker passes time in seconds; Lenis expects ms
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(rafCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(rafCallback)
      lenis.destroy()
    }
  }, [])

  return null
}
