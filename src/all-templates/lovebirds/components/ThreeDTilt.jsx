'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * ThreeDTilt — Reusable component to apply dynamic 3D tilt effect on mouse hover.
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
  const [tiltStyle, setTiltStyle] = useState({})
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mql.matches)
    const onChange = (e) => setReduceMotion(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  const handleMouseMove = (e) => {
    if (reduceMotion) return
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

    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(${scale})`,
      transition: 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
    })
  }

  const handleMouseLeave = () => {
    if (reduceMotion) return
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
      transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
    })
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        ...tiltStyle,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  )
}
