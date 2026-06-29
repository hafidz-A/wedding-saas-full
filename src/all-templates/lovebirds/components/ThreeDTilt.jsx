'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * ThreeDTilt — Reusable component to apply a dynamic 3D tilt effect.
 *
 * Desktop (hover-capable): the card follows the cursor on hover.
 * Touch devices: NO tilt — the card stays flat.
 *
 * The previous device-orientation ("follows the phone's movement") tilt was
 * removed on request: it was unused across the templates and the raw gyroscope
 * stream made the cards jitter. Touch devices now simply render the cards
 * static; only the desktop cursor-hover tilt remains.
 *
 * Automatically disables itself if prefers-reduced-motion is active.
 */
export default function ThreeDTilt({
  children,
  className = '',
  max = 10,
  perspective = 1000,
  scale = 1.03,
  style = {},
}) {
  const cardRef = useRef(null)
  const touchRef = useRef(false) // hover-less device → leave the card flat
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mql.matches)
    const onChange = (e) => setReduceMotion(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  // Detect hover-less (touch) devices so the cursor path stays disabled there —
  // taps emulate a mousemove, and without this a tap would briefly tilt the card.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(hover: none)')
    touchRef.current = mql.matches
    const onChange = (e) => { touchRef.current = e.matches }
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  // Desktop hover: write the transform STRAIGHT to the DOM node (not through
  // React state). The old code called setState on every mousemove (~60-120Hz),
  // re-rendering the whole card + all its children each frame — that was the
  // hover "glitch". Direct style writes keep it buttery. React never owns
  // `transform`, so re-renders never clobber it.
  const handleMouseMove = (e) => {
    if (reduceMotion || touchRef.current) return // taps emulate mousemove — ignore on touch
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left // x position within the element
    const y = e.clientY - rect.top  // y position within the element

    const xc = rect.width / 2
    const yc = rect.height / 2

    // rotateX depends on Y coordinate, rotateY depends on X coordinate
    const angleX = ((yc - y) / yc) * max
    const angleY = ((x - xc) / xc) * max

    card.style.transition = 'transform 0.12s cubic-bezier(0.25, 1, 0.5, 1)'
    card.style.transform =
      `perspective(${perspective}px) rotateX(${angleX.toFixed(2)}deg) rotateY(${angleY.toFixed(2)}deg) scale(${scale})`
  }

  const handleMouseLeave = () => {
    if (reduceMotion || touchRef.current) return
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  )
}
