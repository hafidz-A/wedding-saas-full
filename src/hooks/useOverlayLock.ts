'use client'

import { useEffect, type RefObject } from 'react'

type Lenis = { stop?: () => void; start?: () => void }

/**
 * Pins the page behind a full-screen overlay and restores it on unmount.
 *
 * Three separate things scroll the marketing pages, and all three have to be
 * held or the page creeps along behind the overlay:
 *   1. the native scroller is <html>, not <body> — so `body { overflow: hidden }`
 *      alone still scrolls via wheel/touch over the backdrop;
 *   2. Lenis hijacks the wheel at the window level (no-op when it is absent);
 *   3. hiding the scrollbar reflows the page unless <html> is padded by its width.
 *
 * Focus moves into `focusRef` on open and returns to whatever held it before,
 * so keyboard users are not dropped back at the top of the document on close.
 *
 * Children that must stay natively scrollable need `data-lenis-prevent`.
 *
 * Extracted from PlansModal, which worked out this exact sequence the hard way.
 * ManualPayModal and LegalModal still carry their own partial copies and should
 * be migrated onto this hook separately.
 */
export function useOverlayLock(focusRef?: RefObject<HTMLElement>) {
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const body = document.body
    const lenis = (window as { __lenis?: Lenis }).__lenis
    const scrollbarW = window.innerWidth - html.clientWidth
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlPadRight: html.style.paddingRight,
    }

    lenis?.stop?.()
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`
    focusRef?.current?.focus({ preventScroll: true })

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.paddingRight = prev.htmlPadRight
      lenis?.start?.()
      // `preventScroll` is load-bearing, not defensive: the trigger here is a
      // tall preview card, and a plain focus() scrolls it into view — closing
      // the overlay would yank the page ~180px from where it was left.
      prevActive?.focus?.({ preventScroll: true })
    }
  }, [focusRef])
}

export default useOverlayLock
