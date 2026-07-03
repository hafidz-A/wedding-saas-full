'use client'

import { useEffect } from 'react'

/**
 * Client-side upgrade to phone-frame mode for touch tablets the SERVER could
 * not identify. iPadOS 13+ (and some Android tablets) send a desktop User-Agent
 * — "Macintosh" — so `page.tsx` can't tell them apart from a real laptop and
 * renders the invitation directly. This component runs only on that direct
 * render and, if it detects a touch tablet, sets the `pfframe` cookie and
 * reloads ONCE. The reloaded request carries the cookie, so `page.tsx` then
 * serves the fullscreen iframe (outer page never scrolls → URL bar never moves
 * → constant viewport → smooth scroll, matching the phone path).
 *
 * Only the first-ever visit on such a tablet reloads; the cookie makes every
 * later visit frame server-side with no flash. Phones never reach this (already
 * framed server-side). Desktop never matches (fine pointer). Renders nothing.
 */
export default function TabletFrameUpgrade() {
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.has('embed') || sp.get('noframe') === '1') return
      // Already tried on this device — never loop.
      if (document.cookie.split('; ').some((c) => c === 'pfframe=1')) return

      // A touch tablet: coarse pointer AND a short-side big enough to be a
      // tablet, not a phone (phones are handled server-side; their short side
      // is well under 700). iPad Air portrait short-side = 820; a large phone
      // in landscape tops out ~430.
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const shortSide = Math.min(window.innerWidth, window.innerHeight)
      if (!coarse || shortSide < 700) return

      // One year, lax — scoped to this browser; only ever set on touch tablets.
      document.cookie = 'pfframe=1; path=/; max-age=31536000; samesite=lax'
      window.location.reload()
    } catch {
      /* storage/matchMedia unavailable — leave the direct render as-is. */
    }
  }, [])

  return null
}
