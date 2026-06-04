'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import CinematicCard from './CinematicCard.jsx'
import DummyCardLayer from './DummyCardLayer.jsx'
import FloatingDecoration from './FloatingDecoration.jsx'
import PersonCard from './PersonCard.jsx'
import styles from './BrideGroom.module.css'

gsap.registerPlugin(ScrollTrigger)

const COMPACT_BP = '(max-width: 760px)'
const SMALL_BP = '(max-width: 480px)'
const DEFAULTS = { title: 'The Bride & Groom', people: [] }

function useMatchMedia(query) {
  const [m, setM] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const sync = () => setM(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [query])
  return m
}

function normalizePeople(props) {
  if (Array.isArray(props.people) && props.people.length > 0) return props.people
  const out = []
  if (props.bride) out.push({ role: 'Bride', direction: 'right', ...props.bride, instagram: props.bride.instagram || props.bride.socials?.instagram })
  if (props.groom) out.push({ role: 'Groom', direction: 'left', ...props.groom, instagram: props.groom.instagram || props.groom.socials?.instagram })
  return out
}

export default function BrideGroom(props) {
  const { title } = { ...DEFAULTS, ...props }
  const people = normalizePeople({ ...DEFAULTS, ...props })
  // Couple monogram for the card back (e.g. "A & R"), derived from the actual
  // names instead of a hardcoded "R & A" so every couple sees their own.
  const coupleMonogram = people
    .map((p) => (p?.name || '').trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join(' & ')
  const sectionRef = useRef(null)

  const isCompact = useMatchMedia(COMPACT_BP)
  const isSmall = useMatchMedia(SMALL_BP)
  // Matches the CSS mobile breakpoint where we drop the sticky pin. On mobile
  // each card becomes its own ScrollTrigger so it spins in as it scrolls into
  // view (no long pinned "hold"); on desktop the section stays the trigger so
  // the pair spins together while pinned.
  const isMobile = useMatchMedia('(max-width: 767.98px)')
  const noMotion = useMatchMedia('(prefers-reduced-motion: reduce)')

  // Framer Motion scroll for floating decorations parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  // Re-measure every card's GSAP ScrollTrigger range when the viewport changes.
  // Mobile address-bar collapse, iPad orientation flips, and late content
  // reflow all shift the pin start/end — without a refresh the scrubbed
  // entrance freezes mid-way and the cards can stay invisible ("blank"). The
  // 320ms debounce waits for iPadOS to report the post-rotation size and avoids
  // refreshing on every visualViewport tick during a scroll. Same proven
  // pattern as GallerySpringCoil.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let timer = 0
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 320)
    }
    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', refresh)
    window.visualViewport?.addEventListener('resize', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('orientationchange', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
    }
  }, [])

  const tiltStrength = isSmall ? 0.35 : isCompact ? 0.55 : 1
  const slideDistance = isSmall ? 100 : isCompact ? 180 : 400

  const cardConfigs = people.map((person, i) => {
    const isRight = person.direction === 'right'
    return {
      person, index: i,
      variant: (person.role || '').toLowerCase() || (i === 0 ? 'bride' : 'groom'),
      isRight,
      direction: isRight ? 'right' : 'left',
      // Both cards animate together with slight 10% stagger
      startPct: i * 10,
      endPct: 85 + i * 15,
    }
  })

  return (
    <section ref={sectionRef} className={styles.section} aria-label="The Bride and Groom">
      {!noMotion && (
        <>
          <FloatingDecoration variant="flower" position={{ top: '6%', left: '3%' }} scrollYProgress={scrollYProgress} parallaxSpeed={-40} size={isCompact ? 56 : 100} color="#E8553E" accent="#F5C842" />
          <FloatingDecoration variant="leaf" position={{ top: '12%', right: '4%' }} scrollYProgress={scrollYProgress} parallaxSpeed={50} size={isCompact ? 48 : 80} color="#2D8C4E" spinDuration={0} floatAmplitude={14} floatDuration={7} />
          <FloatingDecoration variant="dots" position={{ top: '50%', left: '5%' }} scrollYProgress={scrollYProgress} parallaxSpeed={70} size={isCompact ? 52 : 110} color="#6B35A8" spinDuration={0} floatAmplitude={10} floatDuration={8} />
          <FloatingDecoration variant="bloom" position={{ bottom: '10%', right: '4%' }} scrollYProgress={scrollYProgress} parallaxSpeed={-55} size={isCompact ? 60 : 120} color="#F5C842" accent="#E8553E" floatAmplitude={12} />
          <FloatingDecoration variant="leaf" position={{ bottom: '6%', left: '8%' }} scrollYProgress={scrollYProgress} parallaxSpeed={45} size={isCompact ? 40 : 65} color="#7CC494" spinDuration={0} floatAmplitude={9} floatDuration={6.5} />
        </>
      )}

      <div className={styles.glowLayer} aria-hidden="true">
        <div className={styles.glowOrb1} />
        <div className={styles.glowOrb2} />
      </div>

      <div className={styles.inner}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className={styles.eyebrow}>With joyful hearts</p>
          <h2 className={styles.title}>{title}</h2>
        </motion.header>

        <div className={styles.stage}>
          {cardConfigs.map((cfg) => (
            <div key={cfg.variant} className={`${styles.slot} ${styles[`slot-${cfg.variant}`]}`}>
              {!noMotion && (
                <DummyCardLayer
                  direction={cfg.direction}
                  triggerRef={sectionRef}
                  variant={cfg.variant}
                  tiltStrength={tiltStrength}
                />
              )}
              <CinematicCard
                direction={cfg.direction}
                triggerRef={sectionRef}
                selfTrigger={isMobile}
                startPct={cfg.startPct}
                endPct={cfg.endPct}
                tiltStrength={tiltStrength}
                distance={slideDistance}
              >
                <div className={styles.cardShadow} aria-hidden="true" />
                <PersonCard person={cfg.person} variant={cfg.variant} monogram={coupleMonogram} />
              </CinematicCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
