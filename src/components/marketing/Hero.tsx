'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { Hero3dBackground } from './Hero3dBackground'
import styles from './Hero.module.css'

export function Hero({ t }: { t: Dict['landing']['hero'] }) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

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
      {/* 3D WebGL Background */}
      <Hero3dBackground />

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
        {/* Editorial Title & Copy */}
        <motion.div 
          className={styles.copy}
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.kicker}>{t.kicker}</span>
          <h1 className={styles.title}>
            {t.title.split(' ').map((word, i) => {
              const isScript = word.toLowerCase().includes('sinematik') || word.toLowerCase().includes('cinematically')
              return (
                <span key={i} className={styles.wordWrap}>
                  <motion.span
                    className={isScript ? styles.scriptWord : styles.word}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {word}{' '}
                  </motion.span>
                </span>
              )
            })}
          </h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          
          <div className={styles.actions}>
            <Link href="/#vibe" className={styles.primary}>
              {t.ctaPrimary}
              <span className={styles.btnArrow}>↓</span>
            </Link>
            <Link href="/#vibe" className={styles.secondary}>
              {t.ctaSecondary}
            </Link>
          </div>
        </motion.div>

        {/* 3D-Floating Phone Preview Card */}
        <motion.div 
          className={styles.visual}
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
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
                <span className={styles.phoneNames} style={{ transform: 'translateZ(15px)' }}>Amara &amp; Rizky</span>
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
        </motion.div>
      </div>

      {/* Scroll Down Indicator */}
      <motion.div 
        className={styles.scrollIndicator}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.75, 0] }}
        transition={{ delay: 1.8, repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <span className={styles.scrollText}>Scroll to begin</span>
        <div className={styles.mouse}>
          <div className={styles.wheel} />
        </div>
      </motion.div>
    </section>
  )
}
