'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './Hero.module.css'

const DEFAULTS = {
  coupleName: '',
  brideName: 'Bride',
  groomName: 'Groom',
  weddingDate: '',
  venue: '',
  welcomeText: 'Welcome, our dear guest',
  scrollHint: 'Scroll to enter',
  countdownEnabled: true,
  gateImage: '',
  blastPhotos: [],
  petals: [],
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

function diffParts(target) {
  if (!target) return null
  const ms = new Date(target).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  const clamped = Math.max(ms, 0)
  const sec = Math.floor(clamped / 1000)
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
    ended: ms <= 0,
  }
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// Eight edge slots that intentionally avoid the centre band (30–70%)
// where the gate card sits.
const PETAL_SLOTS = [
  { top: '4%',     left: '3%',  rot: -22, scale: 1.10, delay: 0.00 },
  { top: '7%',     right: '4%', rot:  18, scale: 0.90, delay: 0.07 },
  { top: '36%',    left: '2%',  rot: -34, scale: 1.00, delay: 0.14 },
  { top: '42%',    right: '3%', rot:  14, scale: 1.05, delay: 0.05 },
  { bottom: '6%',  left: '5%',  rot:  28, scale: 0.95, delay: 0.18 },
  { bottom: '9%',  right: '5%', rot: -18, scale: 1.12, delay: 0.12 },
  { top: '70%',    left: '7%',  rot:   6, scale: 0.78, delay: 0.22 },
  { bottom: '34%', right: '4%', rot: -10, scale: 0.85, delay: 0.16 },
]

// Per-slot scroll rotation speed (mix of CW/CCW, varied magnitudes).
// Multiplied by `progress * 540` so each petal does roughly 1–2 turns
// across the full gate-scroll. Smoothly tied to scroll position.
const PETAL_SCROLL_SPEEDS = [0.9, -1.1, 1.3, -0.8, 0.7, -1.2, 1.0, -0.95]

function PetalShape({ name }) {
  switch (name) {
    case 'coral':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="petal-coral" cx="50%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#FFB39E" />
              <stop offset="55%" stopColor="#E8553E" />
              <stop offset="100%" stopColor="#B83820" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 72, 144, 216, 288].map((r) => (
              <path
                key={r}
                d="M 0 -34 C 11 -30 16 -18 9 -6 C 4 -10 -4 -10 -9 -6 C -16 -18 -11 -30 0 -34 Z"
                fill="url(#petal-coral)"
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
            <radialGradient id="petal-gold" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFE9A8" />
              <stop offset="60%" stopColor="#F5C842" />
              <stop offset="100%" stopColor="#C89A1F" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse
                key={r}
                cx="0"
                cy="-22"
                rx="9"
                ry="18"
                fill="url(#petal-gold)"
                transform={`rotate(${r})`}
              />
            ))}
            <circle r="6" fill="#E8553E" />
          </g>
        </svg>
      )
    case 'emerald':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="petal-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7CC494" />
              <stop offset="60%" stopColor="#2D8C4E" />
              <stop offset="100%" stopColor="#1B5C32" />
            </linearGradient>
          </defs>
          <g transform="translate(50 50)">
            <path
              d="M 0 -38 C -22 -18 -22 18 0 38 C 22 18 22 -18 0 -38 Z"
              fill="url(#petal-emerald)"
            />
            <path
              d="M 0 -34 L 0 34"
              stroke="#1B5C32"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.65"
            />
            {[-22, -10, 4, 18].map((y, i) => (
              <path
                key={i}
                d={`M 0 ${y} Q ${i % 2 ? 9 : -9} ${y + 6} ${i % 2 ? 14 : -14} ${y + 10}`}
                stroke="#1B5C32"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
            ))}
          </g>
        </svg>
      )
    case 'purple':
      return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="petal-purple" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#C9A5E8" />
              <stop offset="60%" stopColor="#6B35A8" />
              <stop offset="100%" stopColor="#3F1D67" />
            </radialGradient>
          </defs>
          <g transform="translate(50 50)">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <path
                key={r}
                d="M 0 -30 C 10 -26 12 -14 0 -4 C -12 -14 -10 -26 0 -30 Z"
                fill="url(#petal-purple)"
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

function DecorCorners() {
  return (
    <div className={styles.decorLayer} aria-hidden="true">
      <svg className={styles.decorTopLeft} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M 12 100 Q 60 100 100 60 T 188 12" stroke="#C89A1F" strokeWidth="0.9" fill="none" opacity="0.55" />
        <path d="M 12 130 Q 70 130 120 80 T 188 40" stroke="#E8553E" strokeWidth="0.7" fill="none" opacity="0.35" />
        <circle cx="12" cy="100" r="3"   fill="#F5C842" />
        <circle cx="100" cy="60" r="2"   fill="#E8553E" />
        <circle cx="188" cy="12" r="2.5" fill="#C89A1F" />
        <circle cx="60"  cy="80" r="1.4" fill="#E8553E" opacity="0.7" />
        <circle cx="140" cy="35" r="1.2" fill="#C89A1F" opacity="0.6" />
      </svg>
      <svg className={styles.decorBottomRight} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M 188 100 Q 130 100 100 140 T 12 188" stroke="#2D8C4E" strokeWidth="0.9" fill="none" opacity="0.55" />
        <path d="M 188 70 Q 120 70 90 120 T 12 160" stroke="#6B35A8" strokeWidth="0.7" fill="none" opacity="0.35" />
        <circle cx="188" cy="100" r="3"   fill="#2D8C4E" />
        <circle cx="100" cy="140" r="2"   fill="#6B35A8" />
        <circle cx="12"  cy="188" r="2.5" fill="#2D8C4E" />
        <circle cx="140" cy="125" r="1.4" fill="#6B35A8" opacity="0.7" />
        <circle cx="60"  cy="160" r="1.2" fill="#2D8C4E" opacity="0.6" />
      </svg>
    </div>
  )
}

export default function Hero(props) {
  const cfg = { ...DEFAULTS, ...props }
  const containerRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [parts, setParts] = useState(() => diffParts(cfg.weddingDate))
  const viewportScale = useViewportScale()

  const blastLayout = useMemo(() => {
    const photos = cfg.blastPhotos || []
    // Base distance adapts to viewport: full on desktop, compressed on mobile
    // so photos stay visible and don't fly off-screen
    const baseDistance = 320 * viewportScale
    const extraDistance = 220 * viewportScale
    return photos.map((src, i) => {
      const seed = (i + 1) * 137.508
      const angle = (i / Math.max(1, photos.length)) * Math.PI * 2 + Math.sin(seed) * 0.7
      const distance = baseDistance + Math.abs(Math.cos(seed * 1.3)) * extraDistance
      return {
        src,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.78,
        rotate: -28 + ((seed * 17) % 56),
        scale: 0.55 + Math.abs(Math.sin(seed * 0.7)) * 0.45,
        delay: (i % 6) * 0.04,
      }
    })
  }, [cfg.blastPhotos, viewportScale])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mql.matches)
    const onChange = (e) => setReduceMotion(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setProgress(1)
      return undefined
    }
    let raf = 0
    const update = () => {
      raf = 0
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      setProgress(total > 0 ? clamp01(scrolled / total) : 0)
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
  }, [reduceMotion])

  useEffect(() => {
    if (!cfg.countdownEnabled || !cfg.weddingDate) return undefined
    const tick = () => setParts(diffParts(cfg.weddingDate))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cfg.countdownEnabled, cfg.weddingDate])

  // Phase math
  const gatePhase      = easeOutCubic(clamp01(progress / 0.5))
  const hintOpacity    = clamp01(1 - progress / 0.08)
  // Overlay stays moderate even at gate=1 so cream-haloed text remains
  // readable where it overlaps the now-small gate image.
  const overlayOpacity = 0.55 - gatePhase * 0.15

  return (
    <section
      ref={containerRef}
      className={styles.gate}
      aria-label="Welcome gate"
      style={{
        '--gate': gatePhase,
        '--hint': hintOpacity,
        '--overlay': overlayOpacity,
      }}
    >
      <div className={styles.sticky}>
        <div className={styles.revealBg} aria-hidden="true" />

        <DecorCorners />

        {/* Edge petals — scale in then rotate with scroll */}
        <div className={styles.petalLayer} aria-hidden="true">
          {(cfg.petals || []).map((name, i) => {
            const slot = PETAL_SLOTS[i % PETAL_SLOTS.length]
            const localT = clamp01((progress - 0.55 - slot.delay) / 0.4)
            const eased = easeOutCubic(localT)
            const scrollRot = progress * 540 * PETAL_SCROLL_SPEEDS[i % PETAL_SCROLL_SPEEDS.length]
            const totalRot = slot.rot * eased + scrollRot
            const positionStyle = {
              top: slot.top,
              left: slot.left,
              right: slot.right,
              bottom: slot.bottom,
            }
            return (
              <div key={i} className={styles.petalAnchor} style={positionStyle}>
                <div
                  className={styles.petalFloat}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <div
                    className={styles.petalReveal}
                    style={{
                      transform: `rotate(${totalRot}deg) scale(${eased * slot.scale})`,
                      opacity: eased,
                    }}
                  >
                    <PetalShape name={name} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Photo blast — behind the card, NO text shown during this phase */}
        <div className={styles.blastLayer} aria-hidden="true">
          {blastLayout.map((p, i) => {
            const localT = clamp01((progress - 0.32 - p.delay) / 0.42)
            const eased = easeOutCubic(localT)
            return (
              <img
                key={i}
                src={p.src}
                alt=""
                className={styles.blastPhoto}
                loading="lazy"
                style={{
                  transform: `translate(calc(-50% + ${p.x * eased}px), calc(-50% + ${p.y * eased}px)) rotate(${p.rotate * eased}deg) scale(${0.25 + p.scale * eased})`,
                  opacity: eased,
                }}
              />
            )
          })}
        </div>

        {/* Main image — never disappears, only shrinks into a rounded card */}
        <div className={styles.gateCard}>
          {cfg.gateImage && (
            <img src={cfg.gateImage} alt="" className={styles.gateImg} />
          )}
          <div className={styles.gateOverlay} aria-hidden="true" />
        </div>

        {/* All gate text overlaid on the main image — fades out on scroll */}
        <div className={styles.gateContent}>
          <p className={styles.welcomeText}>{cfg.welcomeText}</p>
          <h1 className={styles.coupleName}>
            <span className={styles.namePart}>{cfg.brideName}</span>
            <span className={styles.amp}>&amp;</span>
            <span className={styles.namePart}>{cfg.groomName}</span>
          </h1>
          {cfg.weddingDate && (
            <p className={styles.date}>
              <span className={styles.dot} aria-hidden="true" />
              {formatDate(cfg.weddingDate)}
              <span className={styles.dot} aria-hidden="true" />
            </p>
          )}
          {cfg.venue && <p className={styles.venue}>{cfg.venue}</p>}
          {cfg.countdownEnabled && parts && !parts.ended && (
            <ul className={styles.countdown} aria-label="Countdown to the wedding day">
              {[
                { label: 'Days', value: parts.days },
                { label: 'Hours', value: parts.hours },
                { label: 'Min', value: parts.minutes },
                { label: 'Sec', value: parts.seconds },
              ].map((c) => (
                <li key={c.label} className={styles.countCell}>
                  <span className={styles.countValue}>
                    {String(c.value).padStart(2, '0')}
                  </span>
                  <span className={styles.countLabel}>{c.label}</span>
                </li>
              ))}
            </ul>
          )}
          {cfg.countdownEnabled && parts && parts.ended && (
            <p className={styles.ended}>Today is the day — welcome.</p>
          )}
        </div>

        {/* Scroll hint */}
        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollText}>{cfg.scrollHint}</span>
          <span className={styles.scrollLine} />
          <svg className={styles.scrollChev} viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </div>
    </section>
  )
}

/**
 * Returns a 0–1 scale factor based on viewport width so the blast
 * distance compresses on small screens and expands on large ones.
 *
 *   375px  → ~0.35  (photos stay tight around the card)
 *   428px  → ~0.42
 *   768px  → ~0.65
 *   1024px → ~0.82
 *   1440px → 1.0    (full desktop distance)
 *   1920px → 1.0    (capped)
 */
function useViewportScale() {
  const calc = useCallback(() => {
    if (typeof window === 'undefined') return 1
    const w = window.innerWidth
    // Smoothly interpolate: 375→0.35, 768→0.65, 1440→1.0
    const minW = 375
    const maxW = 1440
    const minScale = 0.35
    const maxScale = 1.0
    const t = Math.max(0, Math.min(1, (w - minW) / (maxW - minW)))
    // Use easeOutQuad for a nicer curve — scales faster on tablets
    const eased = 1 - (1 - t) * (1 - t)
    return minScale + (maxScale - minScale) * eased
  }, [])

  const [scale, setScale] = useState(calc)

  useEffect(() => {
    const onResize = () => setScale(calc())
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [calc])

  return scale
}
