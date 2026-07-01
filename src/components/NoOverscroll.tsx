'use client'

import { useEffect } from 'react'

/**
 * Kills the overscroll / rubber-band "bounce" on EVERY page, EVERY browser.
 *
 * Why JS and not just CSS:
 *   - Android/Chrome/Firefox/desktop honour `overscroll-behavior: none`
 *     (set in global.css) and never bounce. Done.
 *   - iOS Safari IGNORES `overscroll-behavior` for the root document, so the
 *     page still rubber-bands and reveals a gap. The only reliable way to stop
 *     it is to cancel the touch gesture the moment it would drag the document
 *     past its top/bottom edge.
 *
 * Design constraints honoured:
 *   - Normal in-bounds scrolling is never touched (the handler early-returns
 *     unless the document is already pinned at the very top or bottom), so the
 *     Lenis smooth-scroll + GSAP ScrollTrigger pinning are unaffected.
 *   - Inner scroll containers (modals, dialogs, the editor's scrollable panels,
 *     dashboard tables) still scroll: before cancelling, we walk up from the
 *     touch target and bail out if any ancestor can still scroll in that
 *     direction. We only block when the gesture would purely overscroll the
 *     document with nothing left to consume it.
 *
 * Mounted once in the root layout <body>, so it covers templates AND the
 * dapur pages (marketing, login, onboarding, dashboard) with no exceptions.
 *
 * Renders nothing — just global side-effect listeners.
 */
export default function NoOverscroll() {
  useEffect(() => {
    // iOS/iPadOS ONLY. Everything else (Android Chrome/Firefox/Samsung, desktop)
    // honours the CSS `overscroll-behavior: none` in global.css, so the JS guard
    // is pure overhead there — and expensive overhead: a NON-PASSIVE document
    // touchmove listener disables compositor-threaded scrolling for the whole
    // page, forcing every touch frame to wait on the main thread. During heavy
    // scroll-driven sections (Lovebirds gate→photoblast) that wait is the
    // "scroll tertahan" jank on Android. iPadOS ≥13 masquerades as macOS, hence
    // the maxTouchPoints check.
    const isIOS =
      /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!isIOS) return undefined

    // Does `target` (or any ancestor up to <body>) have a scroll container that
    // can still move in the gesture's vertical direction? If yes, the gesture
    // belongs to that inner scroller — leave it alone.
    //   deltaY > 0  → finger moving DOWN → content scrolls UP → needs !atTop
    //   deltaY < 0  → finger moving UP   → content scrolls DOWN → needs !atBottom
    const innerScrollerCanConsume = (target: EventTarget | null, deltaY: number): boolean => {
      let node = target instanceof Element ? target : null
      while (node && node !== document.body && node !== document.documentElement) {
        const style = getComputedStyle(node)
        const oy = style.overflowY
        const scrollable = oy === 'auto' || oy === 'scroll'
        if (scrollable && node.scrollHeight > node.clientHeight) {
          const atTop = node.scrollTop <= 0
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
          if (deltaY > 0 && !atTop) return true
          if (deltaY < 0 && !atBottom) return true
        }
        node = node.parentElement
      }
      return false
    }

    let startY = 0
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches.length ? e.touches[0].clientY : 0
    }

    const onTouchMove = (e: TouchEvent) => {
      // Let pinch-zoom and multi-finger gestures through untouched.
      if (e.touches.length !== 1) return

      const curY = e.touches[0].clientY
      const deltaY = curY - startY // >0 pulling down, <0 pulling up

      const scroller = document.scrollingElement || document.documentElement
      const atTop = scroller.scrollTop <= 0
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1

      const overscrollTop = atTop && deltaY > 0 // dragging down with nothing above
      const overscrollBottom = atBottom && deltaY < 0 // dragging up with nothing below
      if (!overscrollTop && !overscrollBottom) return // normal scroll — never interfere

      // An inner scroller still wants this gesture → let it scroll.
      if (innerScrollerCanConsume(e.target, deltaY)) return

      // Pure document overscroll → cancel it (no bounce). Guard non-cancelable
      // (momentum) events so we never throw.
      if (e.cancelable) e.preventDefault()
    }

    // touchstart passive (we never cancel it); touchmove MUST be non-passive so
    // preventDefault() is allowed.
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return null
}
