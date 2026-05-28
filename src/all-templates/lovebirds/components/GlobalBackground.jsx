'use client'

import { useState, useEffect } from 'react'
import styles from './GlobalBackground.module.css'

/**
 * GlobalBackground — a fixed, viewport-pinned ornamental layer that sits
 * behind every section. Recreates the Hero's DecorCorners + petal aesthetic
 * as a continuous, scrolling-independent backdrop so the entire invitation
 * feels cohesive.
 *
 * Responsive-aware: reduces petal count on small screens to avoid crowding.
 */
export default function GlobalBackground({ gifUrl } = {}) {
  const isMobile = useBreakpoint(600)
  const isTablet = useBreakpoint(768)

  // Reduce petals on smaller screens to avoid visual clutter
  const visiblePetals = isMobile
    ? PETAL_LAYOUT.filter((_, i) => i % 3 === 0) // 3-4 petals on phone
    : isTablet
    ? PETAL_LAYOUT.filter((_, i) => i % 2 === 0) // 5 petals on tablet
    : PETAL_LAYOUT // all 10 on desktop

  // Couple can replace the default bird GIF via the dashboard "Background"
  // tab. Empty string means the couple explicitly cleared it — skip rendering.
  const resolvedGif = gifUrl === undefined ? '/images/wedding-animation.gif' : gifUrl

  return (
    <div className={styles.canvas} aria-hidden="true">
      {resolvedGif ? (
        <img className={styles.gifLayer} src={resolvedGif} alt="" />
      ) : null}

      {/* ── Ambient colour washes ── */}
      <div className={styles.washes}>
        <div className={`${styles.wash} ${styles.wash1}`} />
        <div className={`${styles.wash} ${styles.wash2}`} />
        {/* Hide some washes on very small screens */}
        {!isMobile && <div className={`${styles.wash} ${styles.wash3}`} />}
        {!isMobile && <div className={`${styles.wash} ${styles.wash4}`} />}
      </div>

      {/* ── Corner ornaments (matching Hero DecorCorners) ── */}
      <CornerOrnament className={styles.ornamentTL} tone="warm" />
      <CornerOrnament className={styles.ornamentTR} tone="cool" />
      <CornerOrnament className={styles.ornamentBL} tone="cool" />
      <CornerOrnament className={styles.ornamentBR} tone="warm" />

      {/* ── Sweeping decorative curves ── */}
      <div className={styles.lineLayer}>
        <SweepCurve className={`${styles.lineDecor} ${styles.lineDecor1}`} color1="#C89A1F" color2="#E8553E" />
        <SweepCurve className={`${styles.lineDecor} ${styles.lineDecor2}`} color1="#2D8C4E" color2="#6B35A8" />
        {!isTablet && (
          <SweepCurve className={`${styles.lineDecor} ${styles.lineDecor3}`} color1="#F5C842" color2="#3D9BC1" />
        )}
      </div>

      {/* ── Floating petals ── */}
      <div className={styles.petalLayer}>
        {visiblePetals.map((slot, i) => (
          <div key={i} className={styles.petalAnchor} style={slot.position}>
            <div
              className={styles.petalFloat}
              style={{
                animationDelay: `${slot.delay}s`,
                transform: `rotate(${slot.rotate}deg)`,
                opacity: slot.opacity,
              }}
            >
              <PetalShape name={slot.shape} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Simple breakpoint hook ── */
function useBreakpoint(maxWidth) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= maxWidth
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [maxWidth])

  return matches
}

/* ── Corner ornament SVG (same curves & dots as Hero) ── */
function CornerOrnament({ className, tone }) {
  const warm = tone === 'warm'
  const line1 = warm ? '#C89A1F' : '#2D8C4E'
  const line2 = warm ? '#E8553E' : '#6B35A8'
  const dot1  = warm ? '#F5C842' : '#2D8C4E'
  const dot2  = warm ? '#E8553E' : '#6B35A8'
  const dot3  = warm ? '#C89A1F' : '#3D9BC1'

  return (
    <svg className={className} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M 12 100 Q 60 100 100 60 T 188 12"   stroke={line1} strokeWidth="0.9" fill="none" opacity="0.55" />
      <path d="M 12 130 Q 70 130 120 80 T 188 40"    stroke={line2} strokeWidth="0.7" fill="none" opacity="0.35" />
      <path d="M 20 160 Q 80 150 130 100 T 188 65"   stroke={line1} strokeWidth="0.5" fill="none" opacity="0.2" />
      <circle cx="12"  cy="100" r="3"   fill={dot1} />
      <circle cx="100" cy="60"  r="2"   fill={dot2} />
      <circle cx="188" cy="12"  r="2.5" fill={dot3} />
      <circle cx="60"  cy="80"  r="1.4" fill={dot2} opacity="0.7" />
      <circle cx="140" cy="35"  r="1.2" fill={dot3} opacity="0.6" />
      <circle cx="30"  cy="140" r="1.0" fill={dot1} opacity="0.4" />
    </svg>
  )
}

/* ── Long sweeping decorative curve ── */
function SweepCurve({ className, color1, color2 }) {
  return (
    <svg className={className} viewBox="0 0 600 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path
        d="M 0 40 Q 100 10, 200 40 T 400 40 T 600 40"
        stroke={color1}
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 0 55 Q 120 25, 240 55 T 480 55 T 600 30"
        stroke={color2}
        strokeWidth="0.6"
        fill="none"
        opacity="0.3"
      />
      <circle cx="0"   cy="40" r="2"   fill={color1} opacity="0.6" />
      <circle cx="200" cy="40" r="1.5" fill={color2} opacity="0.5" />
      <circle cx="400" cy="40" r="1.8" fill={color1} opacity="0.4" />
      <circle cx="600" cy="40" r="2"   fill={color2} opacity="0.6" />
    </svg>
  )
}

/* ── Petal / flower SVG shapes (same as Hero) ── */
function PetalShape({ name }) {
  switch (name) {
    case 'coral':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g-petal-coral" cx="50%" cy="38%" r="60%">
              <stop offset="0%"   stopColor="#FFB39E" />
              <stop offset="55%"  stopColor="#E8553E" />
              <stop offset="100%" stopColor="#B83820" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 72, 144, 216, 288].map((r) => (
              <path
                key={r}
                d="M 0 -34 C 11 -30 16 -18 9 -6 C 4 -10 -4 -10 -9 -6 C -16 -18 -11 -30 0 -34 Z"
                fill="url(#g-petal-coral)"
                transform={`rotate(${r})`}
              />
            ))}
            <circle r="8" fill="#F5C842" />
            <circle r="4" fill="#B83820" />
          </g>
        </svg>
      )
    case 'gold':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g-petal-gold" cx="50%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#FFE9A8" />
              <stop offset="60%"  stopColor="#F5C842" />
              <stop offset="100%" stopColor="#C89A1F" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx="0" cy="-22" rx="9" ry="18" fill="url(#g-petal-gold)" transform={`rotate(${r})`} />
            ))}
            <circle r="6" fill="#E8553E" />
          </g>
        </svg>
      )
    case 'emerald':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g-petal-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#7CC494" />
              <stop offset="60%"  stopColor="#2D8C4E" />
              <stop offset="100%" stopColor="#1B5C32" />
            </linearGradient>
          </defs>
          <g transform="translate(50 50)">
            <path d="M 0 -38 C -22 -18 -22 18 0 38 C 22 18 22 -18 0 -38 Z" fill="url(#g-petal-emerald)" />
            <path d="M 0 -34 L 0 34" stroke="#1B5C32" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.65" />
            {[-22, -10, 4, 18].map((y, i) => (
              <path
                key={i}
                d={`M 0 ${y} Q ${i % 2 ? 9 : -9} ${y + 6} ${i % 2 ? 14 : -14} ${y + 10}`}
                stroke="#1B5C32" strokeWidth="1" fill="none" opacity="0.5"
              />
            ))}
          </g>
        </svg>
      )
    case 'purple':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g-petal-purple" cx="50%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#C9A5E8" />
              <stop offset="60%"  stopColor="#6B35A8" />
              <stop offset="100%" stopColor="#3F1D67" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <path
                key={r}
                d="M 0 -30 C 10 -26 12 -14 0 -4 C -12 -14 -10 -26 0 -30 Z"
                fill="url(#g-petal-purple)"
                transform={`rotate(${r})`}
              />
            ))}
            <circle r="7" fill="#F5C842" />
            <circle r="3" fill="#3F1D67" />
          </g>
        </svg>
      )
    default:
      return null
  }
}

/* ── Layout for 10 floating petals — pinned to edges, avoiding centre ──
   Uses percentage positions so they scale naturally with viewport.
   On mobile (via useBreakpoint), only every 3rd petal is shown.
   On tablet, every 2nd petal is shown. */
const PETAL_LAYOUT = [
  { shape: 'coral',   position: { top: '6%',   left: '2%'  }, rotate: -18,  delay: 0,    opacity: 0.65 },
  { shape: 'gold',    position: { top: '4%',   right: '4%' }, rotate: 22,   delay: 1.2,  opacity: 0.5  },
  { shape: 'emerald', position: { top: '22%',  right: '1%' }, rotate: -8,   delay: 2.4,  opacity: 0.45 },
  { shape: 'purple',  position: { top: '35%',  left: '1%'  }, rotate: 14,   delay: 0.6,  opacity: 0.4  },
  { shape: 'gold',    position: { top: '50%',  right: '2%' }, rotate: -30,  delay: 3.0,  opacity: 0.45 },
  { shape: 'coral',   position: { top: '55%',  left: '3%'  }, rotate: 26,   delay: 1.8,  opacity: 0.5  },
  { shape: 'emerald', position: { top: '70%',  left: '1%'  }, rotate: -12,  delay: 4.2,  opacity: 0.4  },
  { shape: 'purple',  position: { top: '68%',  right: '3%' }, rotate: 18,   delay: 2.0,  opacity: 0.45 },
  { shape: 'gold',    position: { top: '85%',  left: '4%'  }, rotate: -24,  delay: 3.6,  opacity: 0.5  },
  { shape: 'coral',   position: { top: '88%',  right: '2%' }, rotate: 10,   delay: 0.8,  opacity: 0.45 },
]
