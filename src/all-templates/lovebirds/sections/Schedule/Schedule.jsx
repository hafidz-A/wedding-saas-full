'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import styles from './Schedule.module.css'
import { splitPoints } from '../../utils/splitPoints.js'

const DEFAULTS = { title: 'Schedule', subtitle: '', events: [] }

/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  ANIMATION CUSTOMIZATION                                            ║
   ║  Edit any of these constants to retime the choreography.            ║
   ║                                                                     ║
   ║  Progress values are 0–1 across the pinned scroll, where:           ║
   ║    0 = section just pinned (sticky just attached)                   ║
   ║    1 = section about to unpin (about to leave the viewport)         ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

// Total section height. Higher = longer pin = slower whole sequence.
//   280vh ≈ 180vh of pinned scroll  (fast / snappy)
//   380vh ≈ 280vh of pinned scroll  (default, comfortable cinematic)
//   480vh ≈ 380vh of pinned scroll  (very slow, lots of "hold" time)
const SECTION_HEIGHT_VH = 380

// Cards FADE IN one by one, staggered by index across this window
const CARDS_ENTER_START = 0.06
const CARDS_ENTER_END   = 0.62
const CARD_DURATION     = 0.14   // duration of each card's fade-in

// Cards FADE OUT one by one in the SAME order (top → bottom = event 1
// exits first, then 2, 3, … just like entry). Mirrors the entry cascade.
const EXIT_RANGE_START  = 0.70   // event 1 begins fading out
const EXIT_RANGE_END    = 1.00   // event N finishes fading out
const CARD_EXIT_DURATION = 0.14  // duration of each card's fade-out

// Below this width, fall back to per-card whileInView reveals
const COMPACT_BREAKPOINT = '(max-width: 767.98px)'

/* ════════════════════════════════════════════════════════════════════════ */

function Icon({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'door':    return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="1" /><circle cx="15" cy="12" r="0.8" fill="currentColor" /></svg>
    case 'rings':   return <svg {...common}><circle cx="9" cy="14" r="5" /><circle cx="15" cy="14" r="5" /></svg>
    case 'camera':  return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7l2-3h4l2 3" /><circle cx="12" cy="13" r="3.5" /></svg>
    case 'glass':   return <svg {...common}><path d="M7 4h10l-1.5 7a3.5 3.5 0 01-7 0L7 4z" /><path d="M12 14v6" /><path d="M9 21h6" /></svg>
    case 'plate':   return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /></svg>
    case 'music':   return <svg {...common}><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
    case 'sparkle':
    default:        return <svg {...common}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></svg>
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

export default function Schedule(props) {
  const { title, subtitle, events } = { ...DEFAULTS, ...props }
  const sectionRef = useRef(null)

  const innerRef = useRef(null)

  const isCompact = useMatchMedia(COMPACT_BREAKPOINT)
  const reducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)')
  // The pinned layout is a fixed 100vh box with overflow hidden: long
  // descriptions or many items would be clipped. When the content doesn't
  // fit, fall back to the stacked (natural-height) layout instead.
  const [tooTall, setTooTall] = useState(false)
  const useStacked = isCompact || reducedMotion || tooTall

  useEffect(() => {
    if (isCompact || reducedMotion) return undefined
    const check = () => {
      const el = innerRef.current
      if (el && el.scrollHeight > el.clientHeight + 1) setTooTall(true)
    }
    if (!tooTall) {
      check()
      // The display font loads after first paint and changes line heights.
      document.fonts?.ready?.then(check).catch(() => {})
    }
    // A resize may make it fit again: retry pinned, the check above re-runs.
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => setTooTall(false), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [isCompact, reducedMotion, tooTall, events])

  // Manual rAF-throttled scroll progress
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
    <div ref={innerRef} className={styles.inner}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className={styles.eyebrow}>From morning to midnight</p>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </motion.header>

      <ol className={styles.timeline}>
        {events.map((ev, idx) =>
          useStacked ? (
            <EventStacked key={ev.id || idx} event={ev} index={idx} />
          ) : (
            <EventPinned
              key={ev.id || idx}
              event={ev}
              index={idx}
              total={events.length}
              progress={progress}
            />
          )
        )}
      </ol>
    </div>
  )

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${useStacked ? styles.stackedMode : styles.pinnedMode}`}
      style={sectionStyle}
      aria-label="Schedule of the Day"
    >
      {useStacked ? content : <div className={styles.pinned}>{content}</div>}
    </section>
  )
}

/* ──────────────────────── Pinned variants ─────────────────────── */

function EventPinned({ event, index, total, progress }) {
  // ── Entry stagger ── (top → bottom)
  const enterRange = CARDS_ENTER_END - CARDS_ENTER_START
  const enterStagger =
    total > 1 ? (enterRange - CARD_DURATION) / (total - 1) : 0
  const enterStart = CARDS_ENTER_START + index * enterStagger
  const enterEnd = enterStart + CARD_DURATION

  // ── Exit stagger ── (top → bottom, mirrors entry direction)
  // Event 1 starts exiting first, event N exits last
  const exitRange = EXIT_RANGE_END - EXIT_RANGE_START
  const exitStagger =
    total > 1 ? (exitRange - CARD_EXIT_DURATION) / (total - 1) : 0
  const exitStart = EXIT_RANGE_START + index * exitStagger
  const exitEnd = exitStart + CARD_EXIT_DURATION

  // Pure opacity fade — the whole card (time chip included) shares this
  // opacity since it's all inside the motion.li.
  const opacity = useTransform(
    progress,
    [enterStart, enterEnd, exitStart, exitEnd],
    [0, 1, 1, 0],
    { clamp: true },
  )

  return (
    <motion.li
      className={`${styles.event} ${styles[`accent-${event.accent || 'coral'}`]}`}
      style={{ opacity }}
    >
      <EventContent event={event} />
    </motion.li>
  )
}

/* ──────────────────── Stacked (mobile) variant ─────────────────── */

function EventStacked({ event, index = 0 }) {
  // More visible cascade on mobile: pair opacity with a subtle y-rise
  // and stagger the start by index (chained delay) so when several
  // events are visible at once they reveal one-by-one top → bottom.
  return (
    <motion.li
      className={`${styles.event} ${styles[`accent-${event.accent || 'coral'}`]}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.08, 0.4),  // chain delay, capped
      }}
    >
      <EventContent event={event} />
    </motion.li>
  )
}

/* ───────────────────── Shared inner content ──────────────────── */

/* The time lives INSIDE the card (not in a fixed-width rail column): couples
   write ranges like "07.30 - 10.00" or "11.00 - sd selesai", which overflowed
   the old 80px column onto the timeline line. */
function EventContent({ event }) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}><Icon name={event.icon} /></div>
      <div className={styles.body}>
        {event.time && (
          <p className={styles.timeChip}>
            <ClockIcon />
            <span>{event.time}</span>
          </p>
        )}
        <h3 className={styles.eventTitle}>{event.title}</h3>
        <Description text={event.description} />
      </div>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}

function Description({ text }) {
  const points = splitPoints(text)
  if (points.length === 0) return null
  if (points.length === 1) return <p className={styles.eventDescription}>{points[0]}</p>
  return (
    <ul className={`${styles.eventDescription} ${styles.points}`}>
      {points.map((pt, i) => <li key={i}>{pt}</li>)}
    </ul>
  )
}
