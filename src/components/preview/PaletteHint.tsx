'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './PaletteHint.module.css'

const SEEN_KEY = 'fincards:palette-hint'
const APPEAR_AFTER_MS = 2400
const AUTO_HIDE_AFTER_MS = 14000

/**
 * Resolved placement, in CSS pixels.
 * `bottomOffset` anchors the bubble's BOTTOM edge to the toggle's bottom edge so
 * it grows upward — the toggle sits in a bottom corner, and centring a ~150px
 * bubble on it hangs off the bottom of the viewport.
 * `arrowOffset` then lifts the arrow back to the toggle's vertical centre.
 */
type Placement = { left: number; bottomOffset: number; arrowOffset: number }

/**
 * One-time coach mark pointing at the 🎨 palette switcher in a demo invitation.
 *
 * People reach the preview, admire it, and leave without ever discovering that
 * the palette and ornaments are theirs to play with — the switcher is a small
 * unlabelled emoji in a corner, competing with a full-screen cinematic page.
 *
 * TEMPLATE-AGNOSTIC BY CONTRACT: it locates the switcher by the
 * `data-palette-toggle` attribute and measures it, rather than hard-coding a
 * corner. Lovebirds and Solary already sit at slightly different offsets
 * (20px vs 24px) under different styling systems, so a fixed position would
 * drift. A new template only has to tag its toggle to get this for free.
 *
 * Deliberately quiet: it waits for the hero to land before appearing, shows
 * once per session, and gets out of the way the moment the switcher is opened —
 * the hint has done its job at that point.
 */
export function PaletteHint() {
  const [place, setPlace] = useState<Placement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return
    } catch {}

    let hideTimer: number | undefined
    const dismiss = () => {
      setVisible(false)
      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {}
    }

    const measure = () => {
      const el = document.querySelector('[data-palette-toggle]')
      if (!el) return false
      const r = el.getBoundingClientRect()
      // A zero box means the switcher is mounted but not laid out yet.
      if (r.width === 0 && r.height === 0) return false
      setPlace({
        left: r.right + 12,
        bottomOffset: window.innerHeight - r.bottom,
        arrowOffset: Math.max(0, r.height / 2 - 8),
      })
      return true
    }

    const appearTimer = window.setTimeout(() => {
      if (!measure()) return
      setVisible(true)
      hideTimer = window.setTimeout(dismiss, AUTO_HIDE_AFTER_MS)
    }, APPEAR_AFTER_MS)

    // Opening the switcher IS the goal — stop pointing at it.
    const onPointerDown = (e: Event) => {
      const target = e.target as Element | null
      if (target?.closest?.('[data-palette-toggle]')) dismiss()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    const onResize = () => measure()

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(appearTimer)
      if (hideTimer) window.clearTimeout(hideTimer)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  if (!visible || !place || typeof document === 'undefined') return null

  const close = () => {
    setVisible(false)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {}
  }

  return createPortal(
    <div
      className={styles.wrap}
      style={{ left: place.left, bottom: place.bottomOffset }}
      role="status"
    >
      <span
        className={styles.arrow}
        style={{ marginBottom: place.arrowOffset }}
        aria-hidden="true"
      />
      <div className={styles.bubble}>
        <p className={styles.title}>Warnanya bisa kamu ganti</p>
        <p className={styles.body}>
          Ketuk <span className={styles.emoji}>🎨</span> untuk coba palette dan tampilan lain —
          sepuasnya, gratis.
        </p>
        <button type="button" className={styles.close} onClick={close}>
          Mengerti
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default PaletteHint
