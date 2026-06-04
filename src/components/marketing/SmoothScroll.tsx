'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const rafCallback = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(rafCallback)
    gsap.ticker.lagSmoothing(0)

    // Store in global window for debugging or sharing
    ;(window as any).__lenis = lenis

    // ---- In-page anchor smooth scrolling (e.g. "Template" / "Buat Undangan"
    // CTAs that point to /#vibe). Lenis doesn't handle anchors itself. ----
    const scrollToHash = (hash: string) => {
      if (!hash) return
      const el = document.querySelector(hash)
      if (el) lenis.scrollTo(el as HTMLElement, { offset: -72, duration: 1.1 })
    }
    // Intercept same-page hash links so they glide instead of jumping.
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return
      const href = target.getAttribute('href') || ''
      const hashIndex = href.indexOf('#')
      if (hashIndex < 0) return
      const path = href.slice(0, hashIndex) || '/'
      const hash = href.slice(hashIndex)
      // Only handle links that resolve to the current (home) page.
      if ((path === '/' || path === window.location.pathname) && document.querySelector(hash)) {
        e.preventDefault()
        window.history.pushState(null, '', hash)
        scrollToHash(hash)
      }
    }
    document.addEventListener('click', onClick)
    // Honour an incoming hash (cross-page navigation to /#vibe).
    const initialHash = window.location.hash
    const hashTimer = window.setTimeout(() => scrollToHash(initialHash), 250)
    const onHashChange = () => scrollToHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)

    return () => {
      gsap.ticker.remove(rafCallback)
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHashChange)
      window.clearTimeout(hashTimer)
      lenis.destroy()
      ;(window as any).__lenis = undefined
    }
  }, [])

  return null
}
