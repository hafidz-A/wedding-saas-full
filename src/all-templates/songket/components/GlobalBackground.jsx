'use client'

import { useState, useEffect } from 'react'
import styles from './GlobalBackground.module.css'
import { AdatPetal, UkiranCornerArt, SongketThread } from './adat/AdatPetals.jsx'

/**
 * GlobalBackground — a fixed, viewport-pinned ornamental layer that sits
 * behind every section: ukiran corners, songket threads and adat petals
 * (kembang goyang, melati, sirih, bintang, tanjung). Recreates the Hero's aesthetic
 * as a continuous, scrolling-independent backdrop so the entire invitation
 * feels cohesive.
 *
 * Responsive-aware: reduces petal count on small screens to avoid crowding.
 */
export default function GlobalBackground() {
  const isMobile = useBreakpoint(600)
  const isTablet = useBreakpoint(768)

  // Reduce petals on smaller screens to avoid visual clutter
  const visiblePetals = isMobile
    ? PETAL_LAYOUT.filter((_, i) => i % 3 === 0) // 3-4 petals on phone
    : isTablet
    ? PETAL_LAYOUT.filter((_, i) => i % 2 === 0) // 5 petals on tablet
    : PETAL_LAYOUT // all 10 on desktop

  return (
    <div className={styles.canvas} aria-hidden="true">
      {/* ── Lepus cloth: the songket body motif woven across the whole page ── */}
      <div className={`${styles.fabric} sk-fabric-alt`} />
      <div className={`${styles.fabric} sk-fabric`} />

      {/* ── Ambient colour washes ── */}
      <div className={styles.washes}>
        <div className={`${styles.wash} ${styles.wash1}`} />
        <div className={`${styles.wash} ${styles.wash2}`} />
        {/* Hide some washes on very small screens */}
        {!isMobile && <div className={`${styles.wash} ${styles.wash3}`} />}
        {!isMobile && <div className={`${styles.wash} ${styles.wash4}`} />}
      </div>

      {/* ── Ukiran corners (matching the Hero corners) ── */}
      <UkiranCornerArt className={styles.ornamentTL} />
      <UkiranCornerArt className={styles.ornamentTR} />
      <UkiranCornerArt className={styles.ornamentBL} />
      <UkiranCornerArt className={styles.ornamentBR} />

      {/* ── Songket threads (bintang berantai) ── */}
      <div className={styles.lineLayer}>
        <SongketThread className={`${styles.lineDecor} ${styles.lineDecor1}`} />
        <SongketThread className={`${styles.lineDecor} ${styles.lineDecor2}`} />
        {!isTablet && <SongketThread className={`${styles.lineDecor} ${styles.lineDecor3}`} />}
      </div>

      {/* ── Floating adat petals ── */}
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
              <AdatPetal name={slot.shape} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Simple breakpoint hook ── */
function useBreakpoint(maxWidth) {
  // MUST start false on BOTH server and the client's first render. Reading
  // window.innerWidth in the initializer made the client's first render differ
  // from the server (desktop renders more wash/petal <div>s than mobile),
  // causing a hydration mismatch that crashed this Suspense boundary into
  // client-only rendering. We read the real value after mount instead — a
  // decorative, aria-hidden layer can adjust its petal count a frame later.
  const [matches, setMatches] = useState(false)

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

/* 10 floating petals pinned to viewport edges; mobile shows every 3rd, tablet every 2nd. */
const PETAL_LAYOUT = [
  { shape: 'kembang', position: { top: '6%',   left: '2%'  }, rotate: -18,  delay: 0,    opacity: 0.6  },
  { shape: 'melati',  position: { top: '4%',   right: '4%' }, rotate: 22,   delay: 1.2,  opacity: 0.55 },
  { shape: 'sirih',   position: { top: '22%',  right: '1%' }, rotate: -8,   delay: 2.4,  opacity: 0.4  },
  { shape: 'tabur',   position: { top: '35%',  left: '1%'  }, rotate: 14,   delay: 0.6,  opacity: 0.45 },
  { shape: 'roset',   position: { top: '50%',  right: '2%' }, rotate: -30,  delay: 3.0,  opacity: 0.45 },
  { shape: 'melati',  position: { top: '55%',  left: '3%'  }, rotate: 26,   delay: 1.8,  opacity: 0.5  },
  { shape: 'sirih',   position: { top: '70%',  left: '1%'  }, rotate: -12,  delay: 4.2,  opacity: 0.4  },
  { shape: 'kembang', position: { top: '68%',  right: '3%' }, rotate: 18,   delay: 2.0,  opacity: 0.45 },
  { shape: 'rebung',  position: { top: '85%',  left: '4%'  }, rotate: -24,  delay: 3.6,  opacity: 0.5  },
  { shape: 'melati',  position: { top: '88%',  right: '2%' }, rotate: 10,   delay: 0.8,  opacity: 0.45 },
]
