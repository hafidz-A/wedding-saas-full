'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import SectionBackground from '../../components/SectionBackground.jsx'
import styles from './EventDetails.module.css'

const DEFAULTS = {
  title: 'Event Details',
  subtitle: '',
  events: [],
  mapEmbed: '',
}

/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  ANIMATION CUSTOMIZATION                                            ║
   ║  Edit any of these constants to retime the choreography.            ║
   ║                                                                     ║
   ║  Progress values are 0–1 across the pinned scroll, where:           ║
   ║    0 = section just pinned (sticky just attached)                   ║
   ║    1 = section about to unpin (about to leave the viewport)         ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

// Total section height. Higher = longer pin = slower whole sequence.
//   200vh = 100vh of pinned scroll    (fast / snappy)
//   300vh = 200vh of pinned scroll    (default, comfortable cinematic)
//   400vh = 300vh of pinned scroll    (very slow, lots of "hold" time)
const SECTION_HEIGHT_VH = 380

// CARDS — each card slides in from the LEFT, staggered by index.
const CARDS_ENTER_START = 0.05   // first card begins
const CARDS_ENTER_END   = 0.50   // last card finished entering
const CARD_DURATION     = 0.18   // each card's slide-in duration

// MAP — appears AFTER all cards (last in sequence). Coin-wipe from top.
const MAP_REVEAL_START  = 0.17
const MAP_REVEAL_END    = 0.68

// EXIT — everyone disappears together at the very end of the pinned scroll.
const EXIT_START        = 0.82
const EXIT_END          = 1

// Viewports narrower than this fall back to per-element whileInView reveals
// (the pinned scene would be cramped on small phones).
const COMPACT_BREAKPOINT = '(max-width: 880px)'

/* ════════════════════════════════════════════════════════════════════════ */

function Icon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (name) {
    case 'rings':
      return (
        <svg {...common}>
          <circle cx="9" cy="14" r="5" />
          <circle cx="15" cy="14" r="5" />
          <path d="M7 7l2-3M17 7l-2-3" />
        </svg>
      )
    case 'champagne':
      return (
        <svg {...common}>
          <path d="M8 3h8" />
          <path d="M9 3v6a3 3 0 006 0V3" />
          <path d="M12 12v9" />
          <path d="M9 21h6" />
        </svg>
      )
    case 'sparkle':
    default:
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
        </svg>
      )
  }
}

function useMatchMedia(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [query])
  return matches
}

export default function EventDetails(props) {
  const { title, subtitle, events, mapEmbed } = { ...DEFAULTS, ...props }
  const sectionRef = useRef(null)

  const isCompact = useMatchMedia(COMPACT_BREAKPOINT)
  const reducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)')
  const useStacked = isCompact || reducedMotion

  // Manual rAF-throttled scroll progress (bulletproof for tall sticky sections)
  const progress = useMotionValue(0)
  useEffect(() => {
    if (useStacked) {
      progress.set(0)
      return undefined
    }
    let raf = 0
    const clamp01 = (v) => Math.max(0, Math.min(1, v))
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      progress.set(total > 0 ? clamp01(scrolled / total) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [progress, useStacked])

  const sectionStyle = useStacked
    ? undefined
    : { height: `${SECTION_HEIGHT_VH}vh` }

  const content = (
    <div className={styles.inner}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className={styles.eyebrow}>Save the moments</p>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </motion.header>

      <div className={styles.layout}>
        <div className={styles.events}>
          {events.map((ev, i) =>
            useStacked ? (
              <EventCardStacked key={ev.id} event={ev} />
            ) : (
              <EventCardPinned
                key={ev.id}
                event={ev}
                index={i}
                total={events.length}
                progress={progress}
              />
            )
          )}
        </div>

        {mapEmbed &&
          (useStacked ? (
            <MapCardStacked mapEmbed={mapEmbed} />
          ) : (
            <MapCardPinned mapEmbed={mapEmbed} progress={progress} />
          ))}
      </div>
    </div>
  )

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${useStacked ? styles.stackedMode : styles.pinnedMode}`}
      style={sectionStyle}
      aria-label="Event Details"
    >
      <SectionBackground tone="mixed" />
      {useStacked ? content : <div className={styles.pinned}>{content}</div>}
    </section>
  )
}

/* ──────────────────────── Pinned variants ─────────────────────── */

function EventCardPinned({ event, index, total, progress }) {
  // Stagger math — auto-rebalances for any total count
  const enterRange = CARDS_ENTER_END - CARDS_ENTER_START
  const stagger =
    total > 1 ? (enterRange - CARD_DURATION) / (total - 1) : 0
  const enterStart = CARDS_ENTER_START + index * stagger
  const enterEnd = enterStart + CARD_DURATION

  const keypoints = [enterStart, enterEnd, EXIT_START, EXIT_END]
  // x:  enter from left, hold at 0, hold during exit (just fade), out at 0
  // opacity: 0 → 1 → 1 → 0 (synchronized exit fade with everyone else)
  const x = useTransform(progress, keypoints, [-80, 0, 0, 0], { clamp: true })
  const opacity = useTransform(progress, keypoints, [0, 1, 1, 0], { clamp: true })

  return (
    <motion.article
      className={`${styles.eventCard} ${styles[`accent-${event.accent || 'coral'}`]}`}
      style={{ x, opacity }}
    >
      <EventCardContent event={event} />
    </motion.article>
  )
}

function MapCardPinned({ mapEmbed, progress }) {
  // Coin wipe: bottom inset recedes 100% → 0% (image reveals top-down)
  // PLUS opacity as a safety net — even on browsers where clip-path
  // string interpolation fails (some mobile Safari builds), the opacity
  // transition still reveals the map.
  const clipBottom = useTransform(
    progress,
    [MAP_REVEAL_START, MAP_REVEAL_END],
    [100, 0],
    { clamp: true },
  )
  const clipPath = useTransform(clipBottom, (v) => `inset(0% 0% ${v}% 0%)`)
  // Subtle slide-down for the "coin descending" feel
  const y = useTransform(
    progress,
    [MAP_REVEAL_START, MAP_REVEAL_END],
    [-24, 0],
    { clamp: true },
  )
  // Opacity covers the same window — primary reveal driver.
  // Synchronized exit fade with cards.
  const opacity = useTransform(
    progress,
    [MAP_REVEAL_START, MAP_REVEAL_END, EXIT_START, EXIT_END],
    [0, 1, 1, 0],
    { clamp: true },
  )
  // Scale slight zoom-in to add cinematic feel
  const scale = useTransform(
    progress,
    [MAP_REVEAL_START, MAP_REVEAL_END],
    [0.94, 1],
    { clamp: true },
  )

  return (
    <motion.aside
      className={styles.mapCard}
      style={{ clipPath, y, opacity, scale }}
    >
      <MapContent mapEmbed={mapEmbed} />
    </motion.aside>
  )
}

/* ──────────────────── Stacked (mobile) variants ─────────────────── */

function EventCardStacked({ event }) {
  return (
    <motion.article
      className={`${styles.eventCard} ${styles[`accent-${event.accent || 'coral'}`]}`}
      initial={{ x: -80, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <EventCardContent event={event} />
    </motion.article>
  )
}

function MapCardStacked({ mapEmbed }) {
  // NOTE: avoid clip-path on mobile. iOS Safari + several mobile browsers
  // fail to interpolate `clip-path` strings driven by motion, especially
  // when applied to an element containing an <iframe>. Result: map stays
  // invisible. Opacity + scale + slide is GPU-accelerated and reliable.
  return (
    <motion.aside
      className={styles.mapCard}
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
    >
      <MapContent mapEmbed={mapEmbed} />
    </motion.aside>
  )
}

/* ───────────────────── Shared inner content ──────────────────── */

function EventCardContent({ event }) {
  return (
    <>
      <header className={styles.eventHead}>
        <div className={styles.iconWrap}>
          <Icon name={event.icon} />
        </div>
        <div className={styles.eventHeading}>
          <h3 className={styles.eventName}>{event.label}</h3>
          {event.date && <p className={styles.eventDate}>{event.date}</p>}
        </div>
      </header>
      {event.time && (
        <p className={styles.eventTime}>
          <span className={styles.eventTimeLabel}>Time</span>
          {event.time}
        </p>
      )}
      {event.location && (
        <p className={styles.eventLocation}>{event.location}</p>
      )}
    </>
  )
}

function MapContent({ mapEmbed }) {
  return (
    <>
      <h3 className={styles.mapTitle}>Venue Location</h3>
      <div className={styles.mapWrap}>
        <iframe
          title="Venue map"
          src={mapEmbed}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className={styles.map}
        />
      </div>
      <p className={styles.mapHint}>Tap to open in Google Maps</p>
    </>
  )
}
