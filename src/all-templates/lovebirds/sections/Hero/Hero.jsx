'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import styles from './Hero.module.css'
import { deriveMonogram } from '../../config/monogram.js'
import { readGuestName } from '../../utils/guestName.js'
import useScrollReveal from '../../hooks/useScrollReveal.js'

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

function CuteFlower({ size = 48, color = '#E8553E', centerColor = '#F5C842', className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={{ display: 'inline-block', ...style }} aria-hidden="true">
      <g transform="translate(50, 50)">
        {[0, 72, 144, 216, 288].map((rot) => (
          <ellipse
            key={rot}
            cx="0"
            cy="-20"
            rx="15"
            ry="24"
            fill={color}
            transform={`rotate(${rot})`}
          />
        ))}
        <circle r="12" fill={centerColor} />
      </g>
    </svg>
  )
}

function BotanicalLineArt({ className, style, innerRef }) {
  return (
    <svg ref={innerRef} className={className} style={style} viewBox="0 0 120 180" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M10,170 Q30,130 50,70 T80,10" stroke="#4A3B32" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32,126 C20,122 15,110 22,102 C28,96 34,106 32,126" stroke="#4A3B32" strokeWidth="1" fill="none" />
      <path d="M40,110 C52,106 58,95 50,88 C44,82 38,92 40,110" stroke="#4A3B32" strokeWidth="1" fill="none" />
      <path d="M46,88 C36,82 32,70 40,64 C47,58 52,68 46,88" stroke="#4A3B32" strokeWidth="1" fill="none" />
      <path d="M58,74 C70,70 76,58 68,52 C62,46 56,56 58,74" stroke="#4A3B32" strokeWidth="1" fill="none" />
      <path d="M64,54 C54,48 50,36 58,30 C65,24 70,34 64,54" stroke="#4A3B32" strokeWidth="1" fill="none" />
      <path d="M72,40 C84,36 90,24 82,18 C76,12 70,22 72,40" stroke="#4A3B32" strokeWidth="1" fill="none" />
    </svg>
  )
}

// Eight edge slots that intentionally avoid the centre band (30–70%)
// where the featured photo + glass card sit.
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

// Per-slot spin speed (mix of CW/CCW, varied magnitudes). Each petal spins
// through `540° × speed` during its entrance tween, landing on the slot's
// resting rotation — spin only lives while the timeline plays.
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

function DecorCorners({ innerRef }) {
  return (
    <div ref={innerRef} className={styles.decorLayer} aria-hidden="true">
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

/**
 * Live countdown, isolated in its own component so its 1 Hz setState ticks
 * re-render ONLY this small subtree — not the whole Hero (8 petals, up to 13
 * blast photos, SVG filters).
 */
function Countdown({ weddingDate }) {
  const [parts, setParts] = useState(() => diffParts(weddingDate))
  useEffect(() => {
    const tick = () => setParts(diffParts(weddingDate))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [weddingDate])

  if (!parts) return null
  if (parts.ended) return <p className={styles.ended}>Today is the day — welcome.</p>
  return (
    <ul className={styles.countdown} aria-label="Countdown to the wedding day">
      {[
        { label: 'Days', value: parts.days },
        { label: 'Hours', value: parts.hours },
        { label: 'Min', value: parts.minutes },
        { label: 'Sec', value: parts.seconds },
      ].map((c) => (
        <li key={c.label} className={styles.countCell}>
          {/* The live value (esp. seconds) is computed from Date.now(), so the
              server-rendered number and the value at client hydration differ by
              ~1s. suppressHydrationWarning tells React this text mismatch is
              expected — without it the mismatch throws and forces a re-render. */}
          <span className={styles.countValue} suppressHydrationWarning>
            {String(c.value).padStart(2, '0')}
          </span>
          <span className={styles.countLabel}>{c.label}</span>
        </li>
      ))}
    </ul>
  )
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Hero(props) {
  const cfg = { ...DEFAULTS, ...props }

  // Personalized greeting from the ?to= link the owner sends. Read after mount
  // (not during render) so SSR and the first client render match — avoids a
  // hydration mismatch on this gate.
  const [guestName, setGuestName] = useState(null)
  useEffect(() => {
    setGuestName(readGuestName())
  }, [])

  // Visibility drives play/reverse: enter viewport → play the entrance, leave
  // → reverse (blast retracts to center). once:false keeps observing forever,
  // with isVisible tracking the visible FRACTION: 0.125 = the retract starts
  // once ~7/8 of the hero has scrolled past (a sliver still showing), and the
  // replay starts as soon as that sliver returns. The hook pins isVisible=true
  // under prefers-reduced-motion (no observer), so those users never reverse.
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.125, once: false })

  const contentRef = useRef(null)
  const revealBgRef = useRef(null)
  const decorRefs = useRef([])
  const hintRef = useRef(null)
  const petalRefs = useRef([])
  const blastRefs = useRef([])
  const tlRef = useRef(null)
  const isVisibleRef = useRef(false)
  const { w: vpW, h: vpH } = useViewportSize()

  const blastLayout = useMemo(() => {
    // Cap matches the editor (hero schema blastPhotos maxItems: 12) — each
    // blast photo animates independently, more turns the scatter to clutter.
    const photos = (cfg.blastPhotos || []).slice(0, 12)
    // Responsive scatter: the pattern is designed at desktop reach (370–555px
    // from center), then each AXIS is compressed independently so no photo can
    // land past the viewport edge — portrait phones get a tall narrow burst,
    // landscape a wide flat one, and the featured photo always stays the
    // visible center focus. (The old width-only scale pushed the farthest
    // photos ~50px past the edge on phones and let them poke off-screen
    // vertically on desktop.) Reach widened ~13% + vertical factor 0.92→1.0
    // (2026-07-03) so the burst spreads a touch further top/bottom/sides.
    const DESIGN_REACH = 555 // base 370 + extra 185 at design size
    // Approximate blast-card half sizes per breakpoint (mirrors the CSS clamps)
    const halfW = vpW < 380 ? 45 : vpW < 480 ? 52 : vpW < 768 ? 62 : 100
    const halfH = vpW < 380 ? 57 : vpW < 480 ? 66 : vpW < 768 ? 82 : 130
    const scaleX = Math.min(1, Math.max(0.2, (vpW / 2 - halfW - 12) / DESIGN_REACH))
    const scaleY = Math.min(1, Math.max(0.2, (vpH / 2 - halfH - 12) / DESIGN_REACH))
    return photos.map((src, i) => {
      const seed = (i + 1) * 137.508
      const angle = (i / Math.max(1, photos.length)) * Math.PI * 2 + Math.sin(seed) * 0.7
      const distance = 370 + Math.abs(Math.cos(seed * 1.3)) * 185
      return {
        src,
        x: Math.cos(angle) * distance * scaleX,
        y: Math.sin(angle) * distance * scaleY,
        rotate: -28 + ((seed * 17) % 56),
        scale: 0.55 + Math.abs(Math.sin(seed * 0.7)) * 0.45,
        delay: (i % 6) * 0.04,
      }
    })
  }, [cfg.blastPhotos, vpW, vpH])

  // The old fullscreen gate photo is now the hero of the blast itself:
  // biggest card, dead-center, barely tilted, first to appear.
  const blastItems = useMemo(() => {
    const items = blastLayout.map((b) => ({ ...b, featured: false }))
    if (cfg.gateImage) {
      items.unshift({ src: cfg.gateImage, x: 0, y: 0, rotate: -2, scale: 1, delay: 0, featured: true })
    }
    return items
  }, [blastLayout, cfg.gateImage])

  // Per-petal constants (slot + spin speed) computed once.
  const petalData = useMemo(
    () =>
      (cfg.petals || []).map((name, i) => ({
        name,
        slot: PETAL_SLOTS[i % PETAL_SLOTS.length],
        speed: PETAL_SCROLL_SPEEDS[i % PETAL_SCROLL_SPEEDS.length],
      })),
    [cfg.petals],
  )

  // Build the (paused) entrance timeline. Scroll is NEVER locked — the
  // sequence plays in the background while the user is free to scroll.
  // Deliberately slow, clearly sequential phases (user-tuned 2026-07-02):
  //   1. featured photo grows at center        0.0 → 1.2s
  //   2. ambient decor washes in               0.4 → 1.6s
  //   3. glass card (text + countdown) fades   1.4 → 2.5s
  //   4. photo blast + petals spin in          2.5 → 3.7s
  //   5. scroll hint                           3.6 → 4.2s
  // Rebuilds when the layout inputs change (viewport resize → new scatter
  // distances); after a rebuild the current shown/hidden state is restored
  // instead of replaying.
  useEffect(() => {
    const rm = reducedMotion()
    const fades = [revealBgRef.current, ...decorRefs.current].filter(Boolean)

    const tl = gsap.timeline({ paused: true })

    blastItems.forEach((b, i) => {
      const node = blastRefs.current[i]
      if (!node) return
      gsap.set(node, { xPercent: -50, yPercent: -50 })
      tl.fromTo(
        node,
        { x: 0, y: 0, rotation: 0, scale: 0.25, autoAlpha: 0 },
        { x: b.x, y: b.y, rotation: b.rotate, scale: b.scale, autoAlpha: 1, duration: b.featured ? 1.2 : 0.9, ease: b.featured ? 'power2.out' : 'power3.out' },
        b.featured ? 0 : 2.5 + b.delay * 2.5,
      )
    })
    if (fades.length) {
      tl.fromTo(fades, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power1.out' }, 0.4)
    }
    // The glass card (contentRef) is DELIBERATELY not animated: fading opacity
    // on its frosted backdrop-filter stepped the blur in coarse a/b/c/d stages
    // on mobile GPUs. It's static (full frost from first paint, see
    // .gateContent in the CSS); only the blast/petals/decor animate around it.
    petalData.forEach((p, i) => {
      const node = petalRefs.current[i]
      if (!node) return
      tl.fromTo(
        node,
        { rotation: p.slot.rot - 540 * p.speed, scale: 0, autoAlpha: 0 },
        { rotation: p.slot.rot, scale: p.slot.scale, autoAlpha: 1, duration: 1.1, ease: 'power2.out' },
        2.5 + p.slot.delay,
      )
    })
    if (hintRef.current) {
      tl.fromTo(hintRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, 3.6)
    }

    if (rm) {
      // Reduced motion: jump straight to the final state.
      tl.progress(1)
    } else if (isVisibleRef.current) {
      tl.progress(1)
    }

    tlRef.current = tl
    return () => {
      tl.kill()
      tlRef.current = null
    }
  }, [blastItems, petalData])

  // Play on enter, reverse on leave. The retract runs faster (1.6×) so
  // leaving the hero feels like a snappy gather-back rather than a full
  // 4-second rewind. GSAP resolves mid-flight direction changes smoothly
  // (a quick flick back mid-entrance just rewinds from wherever it is).
  useEffect(() => {
    isVisibleRef.current = isVisible
    const tl = tlRef.current
    if (!tl || reducedMotion()) return
    if (isVisible) {
      tl.timeScale(1)
      tl.play()
    } else if (tl.progress() > 0) {
      tl.timeScale(1.6)
      tl.reverse()
    }
  }, [isVisible, blastItems, petalData])

  return (
    <section
      ref={sectionRef}
      className={styles.gate}
      aria-label="Welcome gate"
    >
      <div className={styles.stage}>
        <div className={styles.revealBg} ref={revealBgRef} aria-hidden="true" />

        <DecorCorners innerRef={(el) => { decorRefs.current[0] = el }} />

        {/* Cute colorful flowers in the top-left corner */}
        <div className={styles.flowerClusteredTopLeft} ref={(el) => { decorRefs.current[1] = el }}>
          <CuteFlower size={44} color="#D97455" centerColor="#FFE9A8" style={{ transform: 'rotate(-10deg)' }} />
          <CuteFlower size={36} color="#E8553E" centerColor="#FFE9A8" style={{ transform: 'rotate(15deg) translateY(-6px)' }} />
          <CuteFlower size={34} color="#F5C842" centerColor="#E8553E" style={{ transform: 'rotate(35deg) translate(-22px, 8px)' }} />
        </div>

        {/* Botanical line-art in the bottom-left corner */}
        <BotanicalLineArt className={styles.decorBottomLeftLineArt} innerRef={(el) => { decorRefs.current[2] = el }} />

        {/* Purple flower in the bottom-right corner */}
        <div className={styles.flowerBottomRight} ref={(el) => { decorRefs.current[3] = el }}>
          <CuteFlower size={40} color="#A5A6E8" centerColor="#FFE9A8" style={{ transform: 'rotate(-20deg)' }} />
        </div>

        {/* Edge petals — spin in with the entrance, then rest (CSS float only) */}
        <div className={styles.petalLayer} aria-hidden="true">
          {(cfg.petals || []).map((name, i) => {
            const slot = PETAL_SLOTS[i % PETAL_SLOTS.length]
            const positionStyle = {
              top: slot.top,
              left: slot.left,
              right: slot.right,
              bottom: slot.bottom,
            }
            // transform + opacity are tweened by the entrance timeline; base
            // rest-state lives in CSS (.petalReveal opacity:0).
            return (
              <div key={i} className={styles.petalAnchor} style={positionStyle}>
                <div
                  className={styles.petalFloat}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <div
                    className={styles.petalReveal}
                    ref={(el) => { petalRefs.current[i] = el }}
                  >
                    <PetalShape name={name} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Photo blast — the featured card (old gate photo) at center plus the
            scattered memories, all behind the glass text card. */}
        <div className={styles.blastLayer} aria-hidden="true">
          {blastItems.map((b, i) => (
            // transform + opacity are tweened by the entrance timeline; base
            // rest-state lives in CSS (.blastPhoto opacity:0). decoding="async"
            // keeps image decode off the main thread so it can't jank the blast.
            <img
              key={i}
              src={b.src}
              alt=""
              className={b.featured ? `${styles.blastPhoto} ${styles.blastFeatured}` : styles.blastPhoto}
              loading={b.featured ? 'eager' : 'lazy'}
              decoding="async"
              ref={(el) => { blastRefs.current[i] = el }}
            />
          ))}
        </div>

        {/* Glow vignette behind/around the featured photo */}
        <div className={styles.gateGlow} ref={(el) => { decorRefs.current[4] = el }} aria-hidden="true" />

        {/* All hero text on the glass card — fades in as one block. */}
        <div className={styles.gateContent} ref={contentRef}>
          <div className={styles.glassCard}>
            <p className={styles.welcomeLine}>
              {/* Dry-brush stroke behind the eyebrow label. The band is filled
                  with the palette's --button-bg and frayed by an feTurbulence +
                  feDisplacementMap filter so it reads as a real painted stroke
                  (ragged bristle edges, tapered ends) rather than a clean bar.
                  The solid core stays opaque under the text, and the label is
                  painted in --button-fg — the guaranteed-contrast pair — so the
                  words sit INSIDE the stroke and stay readable on all palettes.
                  preserveAspectRatio "none" lets it stretch to the label width. */}
              <span className={styles.welcomeMark} aria-hidden="true">
                <svg viewBox="0 0 320 80" preserveAspectRatio="none">
                  <defs>
                    <filter id="lb-welcome-brush" x="-10%" y="-40%" width="120%" height="180%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.016 0.11"
                        numOctaves="2"
                        seed="8"
                        result="noise"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="18"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <g filter="url(#lb-welcome-brush)" fill="currentColor">
                    {/* faint stray-bristle halo (taller, fades around the core) */}
                    <path
                      d="M12 40 C24 24 42 16 64 14 C134 10 210 12 270 16 C296 18 309 26 314 40 C309 54 296 62 270 64 C210 68 134 70 64 66 C42 64 24 56 12 40 Z"
                      opacity="0.4"
                    />
                    {/* solid core that fully carries the text */}
                    <path d="M14 40 C26 28 42 22 64 21 C134 18 208 19 268 22 C292 24 307 30 312 40 C307 50 292 56 268 58 C208 61 134 62 64 59 C42 58 26 52 14 40 Z" />
                  </g>
                </svg>
              </span>
              {/* The single welcome line: the personalized guest name when the
                  owner sent a ?to= link, otherwise the generic welcomeText.
                  Both render inside the same dry-brush stroke (uppercased by
                  .welcomeLine) — never two stacked "welcome" lines. */}
              <span className={styles.welcomeText}>
                {guestName ? `Welcome, dear ${guestName}` : cfg.welcomeText}
              </span>
            </p>
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
            {cfg.countdownEnabled && cfg.weddingDate && (
              <Countdown weddingDate={cfg.weddingDate} />
            )}

            {/* Subtle initials monogram — same source (deriveMonogram) as the
                Couple cards and the Footer, so the order always matches the
                couple name instead of being hardcoded groom-first. */}
            <div className={styles.monogram}>
              {deriveMonogram(cfg.coupleName, { brideName: cfg.brideName, groomName: cfg.groomName })}
            </div>
          </div>
        </div>

        {/* Scroll hint — fades in when the entrance finishes */}
        <div className={styles.scrollHint} ref={hintRef} aria-hidden="true">
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
 * Live viewport size for the responsive blast scatter. Only feeds GSAP tween
 * targets (never rendered markup), so reading window in the initializer is
 * hydration-safe; the SSR fallback is the design (desktop) size.
 */
function useViewportSize() {
  const [size, setSize] = useState(() =>
    typeof window === 'undefined'
      ? { w: 1440, h: 900 }
      : { w: window.innerWidth, h: window.innerHeight },
  )

  useEffect(() => {
    const read = () =>
      setSize((prev) => {
        const w = window.innerWidth
        const h = window.innerHeight
        return prev.w === w && prev.h === h ? prev : { w, h }
      })
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  return size
}
