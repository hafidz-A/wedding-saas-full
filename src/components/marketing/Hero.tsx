'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import styles from './Hero.module.css'
import cta from './cta.module.css'

/* three.js is ~the largest dependency on the marketing landing and this
   background is purely decorative. Loading it statically put all of three.js
   in the bundle that has to hydrate before the hero copy paints — measured
   LCP 6.3s on Slow 4G / 4x CPU. Deferred so it can never block first paint. */
const Hero3dBackground = dynamic(
  () => import('./Hero3dBackground').then((m) => m.Hero3dBackground),
  { ssr: false },
)

export function Hero({ t, priceFrom }: { t: Dict['landing']['hero']; priceFrom?: string | null }) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

  /* Decide client-side whether the decorative WebGL layer is worth its cost.
     Because Hero3dBackground is a dynamic ssr:false import, not rendering it
     means three.js is never even requested — phones skip the download and the
     main-thread work entirely, not just the particles. */
  const [showBackdrop, setShowBackdrop] = useState(false)
  useEffect(() => {
    const wideEnough = window.matchMedia('(min-width: 768px)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setShowBackdrop(wideEnough && !reducedMotion)
  }, [])

  const reassureClauses = [
    ...(priceFrom ? [t.priceFrom.replace('{price}', priceFrom)] : []),
    ...t.reassure.split('·').map((c) => c.trim()),
  ]

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const box = card.getBoundingClientRect()
    const x = e.clientX - box.left - box.width / 2
    const y = e.clientY - box.top - box.height / 2
    
    // Max tilt angle is 15 degrees
    const factorX = 15 / (box.height / 2)
    const factorY = 15 / (box.width / 2)
    
    setTilt({
      rotateX: -y * factorX,
      rotateY: x * factorY,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 })
  }

  return (
    <section className={styles.hero}>
      {/* 3D WebGL Background — desktop, motion-friendly viewers only */}
      {showBackdrop && <Hero3dBackground />}

      {/* Cinematic Ambient Washes */}
      <div className={styles.washes} aria-hidden="true">
        <div className={styles.wash1} />
        <div className={styles.wash2} />
      </div>

      {/* Floating Ornaments */}
      <div className={styles.ornaments} aria-hidden="true">
        <svg className={`${styles.petal} ${styles.petal1}`} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="12" fill="#E8553E" opacity="0.15" />
          <path d="M50 20 C65 30 70 45 50 80 C30 45 35 30 50 20 Z" fill="#E8553E" opacity="0.3" />
        </svg>
        <svg className={`${styles.petal} ${styles.petal2}`} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="10" fill="#F5C842" opacity="0.2" />
          <path d="M50 15 C70 25 70 50 50 85 C30 50 30 25 50 15 Z" fill="#F5C842" opacity="0.35" />
        </svg>
      </div>

      <div className={styles.inner}>
        {/* Editorial Title & Copy — entrance is CSS-driven on purpose: this
            block holds the LCP element, so it must paint straight from the
            server HTML instead of waiting for JS to hydrate. */}
        <div className={styles.copy}>
          <span className={styles.kicker}>{t.kicker}</span>
          <h1 className={styles.title}>
            {t.title.split(' ').map((word, i) => {
              const isScript = word.toLowerCase().includes('sinematik') || word.toLowerCase().includes('cinematically')
              return (
                <span key={i} className={styles.wordWrap}>
                  <span
                    className={isScript ? styles.scriptWord : styles.word}
                    style={{ '--word-delay': `${(i * 0.08 + 0.2).toFixed(2)}s` } as React.CSSProperties}
                  >
                    {word}{' '}
                  </span>
                </span>
              )
            })}
          </h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          
          <div className={styles.actions}>
            <Link href="/#vibe" className={cta.cta}>
              {t.ctaPrimary}
              <span className={cta.arrow}>↓</span>
            </Link>
          </div>
          <p className={styles.reassure}>
            {reassureClauses.map((clause, i) => (
              <span key={i} className={styles.reassureClause}>{clause}</span>
            ))}
          </p>
        </div>

        {/* 3D-Floating Phone Preview Card. Entrance is CSS; the inner tilt
            stays on motion because it is a pointer-driven enhancement. */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.phoneGlow} />
          <motion.div 
            className={styles.phone}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
            }}
            transition={{ type: 'spring', stiffness: 150, damping: 22 }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          >
            <div className={styles.phoneCard} style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>
              <div className={styles.cardHeader} style={{ transform: 'translateZ(10px)' }}>
                <span>L O V E B I R D S</span>
              </div>
              <div className={styles.cardBody} style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
                <span className={styles.phoneScript} style={{ transform: 'translateZ(10px)' }}>The Wedding of</span>
                <span className={styles.phoneNames} style={{ transform: 'translateZ(15px)' }}>Rani &amp; Adi</span>
                <div className={styles.divider} style={{ transform: 'translateZ(10px)' }}>
                  <div className={styles.line} />
                  <span className={styles.dot}>✦</span>
                  <div className={styles.line} />
                </div>
                <span className={styles.phoneDate} style={{ transform: 'translateZ(15px)' }}>11 · 15 · 2026</span>
                <span className={styles.phoneVenue} style={{ transform: 'translateZ(10px)' }}>The Grand Ballroom, Jakarta</span>
              </div>
              <div className={styles.cardFooter} style={{ transform: 'translateZ(15px)' }}>
                <span className={styles.openCta}>OPEN INVITATION</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className={styles.scrollIndicator}>
        <span className={styles.scrollText}>Scroll to begin</span>
        <div className={styles.mouse}>
          <div className={styles.wheel} />
        </div>
      </div>
    </section>
  )
}
