'use client'

/* The edge of a glass card as ONE hand-drawn line: straight, except where it
   turns into a one-line rose or butterfly (config/ornaments.js) on the left
   and right edges, and a celestial run (sparkle, dotted loop, wings, moon)
   along the rest of each side. Two strokes start at the top centre and run down each
   side to the bottom centre; when the card first scrolls into view they draw
   themselves in. Rendered inside the card (position: relative); styles:
   .tb-line in styles/taman-bunga.css. */
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { celestial, ORNAMENT_HEIGHT, ORNAMENTS } from '../config/ornaments.js'

const RADIUS = 16 // matches .tb-sheet's border-radius (--radius-md)

/** Ornament path -> card coordinates: scaled, mirrored for the left edge, moved. */
function place(d, s, mirror, ox, oy) {
  return d
    .replace(/([MC])/g, ' $1 ')
    .trim()
    .split(/\s+/)
    .map((tok) => {
      if (tok === 'M') return 'L'
      if (tok === 'C') return tok
      const [x, y] = tok.split(',').map(Number)
      return `${(ox + (mirror ? -x : x) * s).toFixed(1)},${(oy + y * s).toFixed(1)}`
    })
    .join(' ')
}

/**
 * One side, from the top centre down to the bottom centre.
 * orn: { kind: 'rose' | 'fly', at: 'top' | 'bottom' } or undefined.
 */
function side(w, h, right, orn, scale) {
  const r = RADIUS
  const x = right ? w - 0.8 : 0.8
  const y0 = 0.8
  const y1 = h - 0.8
  const cx = w / 2
  const sweep = right ? 1 : 0
  let d = `M${cx},${y0} H${right ? x - r : x + r} A${r},${r} 0 0 ${sweep} ${x},${y0 + r}`
  // the rest of the side carries the celestial run (sparkle, dotted loop, wings, moon)
  const k = right ? -1 : 1
  if (orn && ORNAMENTS[orn.kind]) {
    const room = y1 - y0 - 2 * r - 12
    const s = Math.min(scale, room / ORNAMENT_HEIGHT[orn.kind])
    const tall = ORNAMENT_HEIGHT[orn.kind] * s
    const oy = orn.at === 'bottom' ? y1 - r - 10 - tall : y0 + r + 10
    const drawing = place(ORNAMENTS[orn.kind], s, !right, x, oy)
    if (orn.at === 'bottom') d += celestial(x, k, y0 + r + 14, oy - 14) + ` V${oy.toFixed(1)} ` + drawing
    else d += ` V${oy.toFixed(1)} ` + drawing + ` M${x},${(oy + tall).toFixed(1)}` + celestial(x, k, oy + tall + 14, y1 - r - 14)
  } else {
    d += celestial(x, k, y0 + r + 14, y1 - r - 14)
  }
  d += ` V${y1 - r} A${r},${r} 0 0 ${sweep} ${right ? x - r : x + r},${y1} H${cx}`
  return d
}

export default function LineFrame({ left, right, scale = 0.56 }) {
  const svgRef = useRef(null)
  const grad = `tb-line-${useId().replace(/:/g, '')}`
  const [box, setBox] = useState(null)
  const [drawn, setDrawn] = useState(false)

  // follow the card's size
  useEffect(() => {
    const card = svgRef.current?.parentElement
    if (!card) return undefined
    const measure = () => {
      const w = card.offsetWidth
      const h = card.offsetHeight
      setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(card)
    return () => ro.disconnect()
  }, [])

  // each stroke's real length, for the draw-on (before paint, so no flash of the whole line)
  useLayoutEffect(() => {
    svgRef.current?.querySelectorAll('path').forEach((p) => {
      p.style.setProperty('--len', `${Math.ceil(p.getTotalLength() + 2)}px`)
    })
  }, [box])

  // draw in once, when the card first comes into view
  useEffect(() => {
    const card = svgRef.current?.parentElement
    if (!card || drawn) return undefined
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setDrawn(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(card)
    return () => io.disconnect()
  }, [drawn])

  return (
    <svg
      ref={svgRef}
      className={`tb-line${drawn ? ' tb-line-in' : ''}`}
      width={box?.w || 0}
      height={box?.h || 0}
      viewBox={box ? `0 0 ${box.w} ${box.h}` : undefined}
      aria-hidden="true"
    >
      {box && (
        <>
          <defs>
            <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={box.w} y2={box.h}>
              {/* style, not the stop-color attribute: attributes don't read CSS variables */}
              <stop offset="0" style={{ stopColor: 'var(--tb-gold)' }} />
              <stop offset="0.55" style={{ stopColor: 'var(--tb-blush)' }} />
              <stop offset="1" style={{ stopColor: 'var(--tb-gold)' }} />
            </linearGradient>
          </defs>
          <path stroke={`url(#${grad})`} d={side(box.w, box.h, false, left, scale)} />
          <path stroke={`url(#${grad})`} d={side(box.w, box.h, true, right, scale)} />
        </>
      )}
    </svg>
  )
}
