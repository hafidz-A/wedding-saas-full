'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import styles from './Hero.module.css'
import { deriveMonogram } from '../../config/monogram.js'
import { readGuestName } from '../../utils/guestName.js'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import { AdatPetal, UkiranCornerArt, SimbarLineArt } from '../../components/adat/AdatPetals.jsx'
import { RumahLimas } from '../../components/adat/AdatShapes.jsx'

const DEFAULTS = {
  coupleName: '',
  brideName: 'Bride',
  groomName: 'Groom',
  weddingDate: '',
  venue: '',
  welcomeText: 'Kepada Yth. Bapak/Ibu/Saudara/i',
  scrollHint: 'Gulir untuk masuk',
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
    return new Date(iso).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// Lovebirds' cute flowers / botanical line-art are replaced by the adat set
// (components/adat/AdatPetals.jsx): kembang goyang, melati, tanjung, simbar.

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

function DecorCorners({ innerRef }) {
  return (
    <div ref={innerRef} className={styles.decorLayer} aria-hidden="true">
      <UkiranCornerArt className={styles.decorTopLeft} />
      <UkiranCornerArt className={styles.decorBottomRight} style={{ transform: 'rotate(180deg)' }} />
    </div>
  )
}

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
        { label: 'Hari', value: parts.days },
        { label: 'Jam', value: parts.hours },
        { label: 'Menit', value: parts.minutes },
        { label: 'Detik', value: parts.seconds },
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
    if (contentRef.current) {
      tl.fromTo(contentRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.1, ease: 'power2.out' }, 1.4)
    }
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
      aria-label="Pembuka"
    >
      <div className={styles.stage}>
        <div className={styles.revealBg} ref={revealBgRef} aria-hidden="true" />

        {/* Songket cloth behind the gate, framed top and bottom by the kepala
            kain (pucuk rebung hanging from a woven edge), as on the cloth itself. */}
        <div className={`${styles.gateFabric} sk-fabric`} aria-hidden="true" />
        <div className={`${styles.kainTop} sk-kepala-kain`} aria-hidden="true" />
        <div className={`${styles.kainBottom} sk-kepala-kain sk-kepala-kain--up`} aria-hidden="true" />

        {/* Rumah Limas standing quietly behind the photo blast. */}
        <RumahLimas className={styles.limas} />

        <DecorCorners innerRef={(el) => { decorRefs.current[0] = el }} />

        {/* Kembang goyang + melati cluster in the top-left corner */}
        <div className={styles.flowerClusteredTopLeft} ref={(el) => { decorRefs.current[1] = el }}>
          <AdatPetal name="kembang" style={{ width: 44, height: 44, display: 'inline-block', transform: 'rotate(-10deg)' }} />
          <AdatPetal name="melati" style={{ width: 36, height: 36, display: 'inline-block', transform: 'rotate(15deg) translateY(-6px)' }} />
          <AdatPetal name="tanjung" style={{ width: 34, height: 34, display: 'inline-block', transform: 'rotate(35deg) translate(-22px, 8px)' }} />
        </div>

        {/* Simbar fern line-art in the bottom-left corner */}
        <SimbarLineArt className={styles.decorBottomLeftLineArt} innerRef={(el) => { decorRefs.current[2] = el }} />

        {/* Melati in the bottom-right corner */}
        <div className={styles.flowerBottomRight} ref={(el) => { decorRefs.current[3] = el }}>
          <AdatPetal name="melati" style={{ width: 40, height: 40, display: 'inline-block', transform: 'rotate(-20deg)' }} />
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
                    <AdatPetal name={name} />
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
                    <filter id="sk-welcome-brush" x="-10%" y="-40%" width="120%" height="180%">
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
                  <g filter="url(#sk-welcome-brush)" fill="currentColor">
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
                {guestName ? `Kepada Yth. ${guestName}` : cfg.welcomeText}
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
