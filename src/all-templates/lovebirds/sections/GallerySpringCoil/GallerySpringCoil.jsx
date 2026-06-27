'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BotanicalSketchLayer } from '../../components/BotanicalBorder.tsx'
import SceneFrame from '../../components/SceneFrame.jsx'

gsap.registerPlugin(ScrollTrigger)

/* Carousel-style ring: upright cards facing the screen (no coil tilt — the
   per-card counter-rotation in renderFrame keeps every photo flat to the
   viewer), a ring radius that widens with the photo count so up to 30 cards
   keep breathing room, and a far perspective so the front card is a gentle
   zoom rather than an in-your-face blowup. */
const buildConfig = (N) => {
  const safeN = Math.max(1, N)
  const cardWidth = 150
  const cardHeight = 194

  return {
    scrollPerPhoto: 130,
    rotationPerPhoto: 360 / safeN,
    // A whisper of rise per photo — the path reads as a circle, not a climb.
    pitchY: Math.max(6, Math.min(26, 240 / safeN)),
    // Ring widens with N: circumference ≈ N × cardWidth × 0.92, clamped so
    // small sets still look like a ring and huge sets don't blow the stage.
    // 0.92 (was 1.05) pulls the left/right neighbours ~15% closer to the
    // front card; the min clamp dropped 260 → 235 so small sets tighten too.
    radius: Math.max(235, Math.min(560, (safeN * cardWidth * 0.92) / (2 * Math.PI))),
    // The RING leans back a touch so its circular path is visible on screen;
    // the cards themselves counter-rotate and stay perfectly upright.
    ringTiltX: 14,
    cardWidth,
    cardHeight,
    frontScale: 1.12,
    neighborGap: 56,
    depthOpacityMin: 0.12,
    // Softer side blur than before (was 3.0): the front card is always
    // pinned to 0 (see renderFrame), so the only blur left is the gentle
    // depth falloff on the neighbours — keep it subtle and cheap to paint.
    depthBlurMax: 2.0,
    depthScaleMin: 0.4,
    sideOpacityMax: 0.3,
  }
}

const COMPONENT_STYLES = `
.gsc-section {
  position: relative;
  width: 100%;
  /* Contain any horizontal overflow from the bouquets (which use
     left/right: -14% on mobile) and 3D-rotated coil cards so the page
     never gets a horizontal scrollbar from this section. */
  overflow: hidden;
  background: var(--bg, var(--color-cream, #f5f0eb));
  color: var(--fg, var(--color-charcoal, #2a2118));
}

.gsc-scene {
  position: relative;
  height: 100vh;
  overflow: hidden;
  isolation: isolate;
}

.gsc-stage {
  position: absolute;
  inset: 0;
  z-index: 10;
  /* Far perspective = "camera pulled back": the front card zooms gently
     instead of blowing up, and the widened ring still fits the stage. */
  perspective: 1500px;
  perspective-origin: 50% 48%;
}

.gsc-gallerySketch {
  mix-blend-mode: multiply;
}

/* The ornament motif at the edges comes from the shared SceneFrame (same as
   RSVP / footer): two columns pinned to the LEFT & RIGHT, centre left clear.
   SceneFrame fills its motifs with --button-fg (tuned for accent-bg sections);
   the gallery sits on the normal section bg, so retint to --accent here so the
   birds/butterflies stay visible on every palette. The gallery already has its
   own centre vignette, so SceneFrame's faint centre haze is dropped to avoid
   doubling up. */
.gsc-scene .lb-scene__side svg {
  fill: var(--accent, #E8553E);
  color: var(--accent, #E8553E);
}
.gsc-scene .lb-scene__haze { display: none; }

.gsc-coilAnchor {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
  transform-style: preserve-3d;
}

.gsc-coil {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.gsc-coilCard {
  position: absolute;
  top: calc(var(--gsc-card-h, 230px) / -2);
  left: calc(var(--gsc-card-w, 170px) / -2);
  width: var(--gsc-card-w, 170px);
  height: var(--gsc-card-h, 230px);
  overflow: visible;
  pointer-events: none;
  /* flat, NOT preserve-3d: the cards are billboarded (always face the
     viewer), and keeping their subtree in the 3D context made Chrome slice
     frame decorations (border/shadow/outline) into stray gold slivers. */
  transform-style: flat;
  /* Only promote transform + opacity. The filter property is deliberately
     NOT promoted: pre-allocating a blur layer for all 16-30 cards costs a
     lot of GPU memory even when most cards aren't blurred. The front card
     is never blurred, and side-card blur is written only when it changes
     (see renderFrame), so an on-demand filter layer is far cheaper. */
  will-change: transform, opacity;
}

.gsc-coilButton {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  outline: none;
}

.gsc-coilFrame {
  /* MUST be block: this is a <span>, and as an inline box containing a block
     <img> it fragments — the empty fragments then paint the highlight ring
     as a detached vertical gold sliver at the card's centre. */
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.34));
  border-radius: 12px;
  background: var(--glass-bg, rgba(255,255,255,0.16));
  transition: border-color 0.35s ease;
}

/* The active-card highlight is painted INSIDE the frame (overflow: hidden)
   — outlines and box-shadows on these 3D-transformed cards get projected as
   detached gold slivers by the preserve-3d context, so nothing decorative
   may live outside the card's own clip. */
.gsc-coilFrame::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--color-gold, #F5C842);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.gsc-coilCard[data-front="true"] .gsc-coilFrame {
  border-color: rgba(255,255,255,0.95);
}

.gsc-coilCard[data-front="true"] .gsc-coilFrame::after {
  opacity: 1;
}

/* Keyboard focus uses the same inside-the-clip ring (3D-safe). */
.gsc-coilButton:focus-visible .gsc-coilFrame::after {
  opacity: 1;
  border-color: var(--accent, #C8B496);
}

.gsc-coilEntry,
.gsc-coilImage,
.gsc-lightboxImage {
  display: block;
  width: 100%;
  height: 100%;
}

.gsc-coilImage,
.gsc-lightboxImage {
  object-fit: cover;
  user-select: none;
}

.gsc-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, var(--glass-bg, rgba(255,255,255,0.22)), transparent),
    var(--bg, #f5f0eb);
  color: var(--fg-muted, rgba(42,33,24,0.42));
  font-family: var(--font-display, serif);
  font-size: 22px;
  font-style: italic;
}

.gsc-coilCaption {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  width: min(100%, 20rem);
  margin: 0;
  color: var(--fg-muted, rgba(42,33,24,0.52));
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  font-style: italic;
  letter-spacing: 0.04em;
  line-height: 1.45;
  text-align: center;
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.gsc-coilCard[data-front="true"] .gsc-coilCaption {
  opacity: 1;
}

.gsc-vignette,
.gsc-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gsc-vignette {
  z-index: 30;
  background: radial-gradient(
    ellipse 68% 68% at 50% 48%,
    transparent 26%,
    color-mix(in srgb, var(--bg, #f5f0eb) 58%, transparent) 58%,
    var(--bg, var(--color-cream, #f5f0eb)) 100%
  );
}

.gsc-fade {
  z-index: 31;
  background: linear-gradient(
    to bottom,
    var(--bg, var(--color-cream, #f5f0eb)) 0%,
    transparent 16%,
    transparent 82%,
    var(--bg, var(--color-cream, #f5f0eb)) 100%
  );
}

.gsc-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  padding: clamp(28px, 5vw, 48px) clamp(22px, 4vw, 40px);
  pointer-events: none;
}

.gsc-title {
  margin: 0 0 10px;
  color: var(--fg, var(--color-charcoal, #2a2118));
  font-family: var(--font-display, serif);
  font-size: clamp(42px, 6vw, 76px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.95;
}

.gsc-subtitle {
  margin: 0;
  max-width: 620px;
  color: var(--fg-muted, var(--color-charcoal-light, rgba(42,33,24,0.62)));
  font-family: var(--font-body, sans-serif);
  font-size: clamp(15px, 2vw, 22px);
  letter-spacing: 0.08em;
  line-height: 1.55;
}

/* Demo-preview ribbon (only rendered when the demoNote prop is set). */
.gsc-demoNote {
  width: fit-content;
  max-width: min(86vw, 560px);
  margin: 14px 0 0;
  padding: 10px 22px;
  border-radius: 999px;
  background: var(--glass-bg, rgba(255,255,255,0.6));
  border: 1px solid var(--glass-border, rgba(42,33,24,0.12));
  color: var(--fg-muted, rgba(42,33,24,0.7));
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  line-height: 1.55;
}

.gsc-counter {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(24px, 4vw, 42px);
  z-index: 60;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: var(--fg-muted, rgba(42,33,24,0.62));
  font-family: var(--font-body, sans-serif);
  text-align: center;
  text-transform: uppercase;
  pointer-events: none;
}

.gsc-count {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.18em;
}

.gsc-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.gsc-dot {
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: var(--fg, rgba(0,0,0,0.15));
  opacity: 0.28;
  transition: width 0.3s ease, opacity 0.3s ease, background-color 0.3s ease;
}

.gsc-dotActive {
  width: 18px;
  background: var(--fg, rgba(0,0,0,0.5));
  opacity: 0.7;
}

.gsc-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.gsc-lightboxFigure {
  max-width: min(92vw, 1120px);
  max-height: 88vh;
  margin: 0;
  display: grid;
  justify-items: center;
  gap: 14px;
}

.gsc-lightboxImage {
  max-width: 100%;
  max-height: 78vh;
  border-radius: 12px;
  box-shadow: 0 24px 72px rgba(0,0,0,0.52);
}

.gsc-lightboxCaption {
  margin: 0;
  max-width: 64ch;
  color: rgba(255,255,255,0.92);
  font-family: var(--font-body, sans-serif);
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}

.gsc-lightboxButton {
  position: absolute;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid rgba(255,255,255,0.24);
  border-radius: 999px;
  color: #fff;
  background: rgba(255,255,255,0.10);
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  backdrop-filter: blur(10px);
}

.gsc-lightboxButton:hover,
.gsc-lightboxButton:focus-visible {
  background: rgba(255,255,255,0.22);
}

.gsc-close { top: 24px; right: 24px; }
.gsc-prev { top: 50%; left: 24px; transform: translateY(-50%); }
.gsc-next { top: 50%; right: 24px; transform: translateY(-50%); }

@media (max-width: 760px) {
  .gsc-coilCard {
    --gsc-card-w: 131px !important;
    --gsc-card-h: 165px !important;
    /* On mobile we don't animate the filter per frame (handled in JS),
       so tell the browser not to allocate a filter compositing layer. */
    will-change: transform, opacity;
  }

  /* Thinner highlight ring on mobile. */
  .gsc-coilFrame::after {
    border-width: 1px;
  }

  .gsc-stage {
    perspective: 1250px;
  }

  .gsc-title {
    font-size: clamp(36px, 12vw, 56px);
  }

  .gsc-subtitle {
    max-width: 18rem;
    font-size: 13px;
  }
}
`

/* The carousel ring widens with the photo count (buildConfig.radius), so 30
   upright cards stay readable. The editor caps the field at the same number
   (gallerySpringCoil schema maxItems). */
const MAX_PHOTOS = 30

function normalizePhotos(photos) {
  return photos.slice(0, MAX_PHOTOS).map((photo, index) => ({
    // Guard against duplicate/empty ids in stored configs — a repeated React
    // key makes cards vanish or stick when one is removed from the middle.
    id: photo.id ? `${photo.id}-${index}` : index,
    // `src` is what the small coil card shows (a lightweight thumbnail in
    // the demo); `full` is the high-res original loaded only in the
    // lightbox when a guest taps to zoom. Falls back to `src` when no
    // separate full-res URL was provided (e.g. real uploaded photos).
    src: photo.src || '',
    full: photo.full || photo.src || '',
    caption: photo.caption || photo.alt || '',
  }))
}

function clampIndex(index, total) {
  return Math.max(0, Math.min(total - 1, index))
}

function CoilPhoto({ photo, index, config, cardRef, hasEntered, onOpen }) {
  const label = photo.caption || `Foto ${index + 1}`

  return (
    <div
      ref={cardRef}
      className="gsc-coilCard"
      style={{
        '--gsc-card-w': `${config.cardWidth}px`,
        '--gsc-card-h': `${config.cardHeight}px`,
      }}
      data-front="false"
    >
      <motion.div
        className="gsc-coilEntry"
        initial={{ y: 80, opacity: 0 }}
        animate={hasEntered ? { y: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', stiffness: 80, damping: 14, delay: index * 0.04 }}
      >
        <button
          type="button"
          className="gsc-coilButton"
          onClick={() => onOpen(index)}
          aria-label={label}
          tabIndex={-1}
        >
          <span className="gsc-coilFrame">
            {photo.src ? (
              <img
                /* keyed by src so editing the photo remounts the element and
                   clears a previous onError display:none */
                key={photo.src}
                className="gsc-coilImage"
                src={photo.src}
                alt={label}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            ) : (
              <span className="gsc-placeholder">foto {index + 1}</span>
            )}
          </span>
          {photo.caption && <span className="gsc-coilCaption">{photo.caption}</span>}
        </button>
      </motion.div>
    </div>
  )
}

export default function GallerySpringCoil({
  photos = [],
  sectionTitle = 'Moments',
  sectionSubtitle = 'Memori kami menjalin dalam spiral kenangan',
  demoNote = '',
}) {
  const displayPhotos = useMemo(() => normalizePhotos(photos), [photos])
  const total = displayPhotos.length
  const config = useMemo(() => buildConfig(total), [total])
  // Deterministic seed (no Date.now) so server and client render identical
  // botanical paths — avoids a React hydration mismatch on the SVG `d` attrs.
  const gallerySketchSeed = useMemo(() => (0x6d2b79f5 ^ total) >>> 0, [total])

  const sectionRef = useRef(null)
  const sceneRef = useRef(null)
  const coilRef = useRef(null)
  const cardsRef = useRef([])
  const scrollProgress = useRef(0)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const lastActiveRef = useRef(-1)

  const [hasEntered, setHasEntered] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [sectionElement, setSectionElement] = useState(null)
  const [gallerySketchVisible, setGallerySketchVisible] = useState(false)

  const lightboxPhoto = lightboxIndex !== null ? displayPhotos[lightboxIndex] : null

  const setCardRef = (index) => (element) => {
    if (element) cardsRef.current[index] = element
  }

  const setSectionRef = useCallback((element) => {
    sectionRef.current = element
    setSectionElement(element)
  }, [])

  // ScrollTrigger pins the section; rAF moves the actual coil cards.
  useEffect(() => {
    const section = sectionRef.current
    const scene = sceneRef.current
    const coil = coilRef.current
    if (!section || !scene || !coil || total === 0) return undefined

    cardsRef.current.length = total

    let raf = 0
    let inView = false

    // Live media query (read per frame, not captured once) so a resize or
    // orientation flip across 760px updates the blur-skip + radius scale
    // without remounting the section.
    const mobileMQL = window.matchMedia('(max-width: 760px)')

    // Per-card button lookup cached — the old code ran querySelector on
    // every card on every frame (~880 calls/s measured on a 16-photo ring).
    const buttonCache = new WeakMap()
    const getButton = (card) => {
      let button = buttonCache.get(card)
      if (button === undefined) {
        button = card.querySelector('.gsc-coilButton')
        buttonCache.set(card, button)
      }
      return button
    }

    /**
     * Pure transform computation — no scheduling. Reads scrollProgress
     * and mouse refs, writes inline styles on coilRef + each card.
     *
     * Pulled out of the rAF loop so we can call it *synchronously* on
     * enter — the very first paint after the section re-enters view
     * shows the correct coil layout instead of the stale style from
     * when it last left.
     */
    const renderFrame = () => {
      const isMobile = mobileMQL.matches
      // Skip per-frame CSS filter:blur on mobile — it's the single most
      // expensive op in the loop (forces fragment re-paint of the whole
      // card every frame). The visual loss is minor; the FPS gain is huge.
      const useBlur = !isMobile
      // Pull the ring in on phones: the cards are smaller there, and the
      // full-size radius pushed the side photos off a 390px screen.
      const radius = config.radius * (isMobile ? 0.85 : 1)
      const progress = scrollProgress.current
      const activeRaw = progress * (total - 1)
      const nextActive = clampIndex(Math.round(activeRaw), total)
      const rotY = -(activeRaw * config.rotationPerPhoto)
      const activeBaseY = (activeRaw - (total - 1) / 2) * config.pitchY
      const riseY = -activeBaseY
      // Mouse parallax kept deliberately small — a soft drift, never dizzying.
      const tiltX = (mouse.current.y - 0.5) * 3
      const tiltY = (mouse.current.x - 0.5) * 5
      // The ring's yaw/pitch are baked into per-card translate3d positions
      // below — no rotations ever reach the DOM. Rotated card planes inside
      // preserve-3d made Chrome slice frame decorations into gold slivers.
      const yawBase = rotY + tiltY
      const pitchRad = ((config.ringTiltX + tiltX) * Math.PI) / 180
      const sinPitch = Math.sin(pitchRad)
      const cosPitch = Math.cos(pitchRad)
      // The 14° ring pitch lifts the near (front) card by radius×sin(pitch)
      // above the anchor, which sat the whole composition too high in the
      // scene (front card measured ~120px above centre, clipping under the
      // header on phones). Drop the ring by that lift plus a small constant
      // so the front card rests just below the scene's vertical centre.
      const ringLift =
        radius * Math.sin((config.ringTiltX * Math.PI) / 180) + 16

      coil.style.transform = `translateY(${riseY}px)`

      for (let index = 0; index < total; index += 1) {
        const card = cardsRef.current[index]
        if (!card) continue

        const button = getButton(card)
        const staticAngle = index * config.rotationPerPhoto
        const effective = ((staticAngle + rotY) % 360 + 360) % 360
        const depthNorm = effective > 180 ? 360 - effective : effective
        const depthT = depthNorm / 180
        const indexDelta = index - activeRaw
        const frontness = Math.max(0, 1 - Math.abs(indexDelta))
        const easedFrontness = frontness * frontness * (3 - 2 * frontness)
        const nearNeighbor = Math.max(0, 1 - Math.abs(Math.abs(indexDelta) - 1))
        const yGap = Math.sign(indexDelta) * config.neighborGap * nearNeighbor
        const yOffset = (index - (total - 1) / 2) * config.pitchY + yGap
        const isFront = index === nextActive
        const sideScale = Math.max(config.depthScaleMin, config.sideOpacityMax + (1 - depthT) * 0.18)
        const scale = sideScale + (config.frontScale - sideScale) * easedFrontness
        const sideOpacity = Math.max(config.depthOpacityMin, config.sideOpacityMax * (1 - depthT * 0.82))
        const opacity = sideOpacity + (1 - sideOpacity) * easedFrontness
        // The centre/front card is ALWAYS perfectly sharp — never blurred,
        // mid-scroll or at rest, on any device. Only the neighbours get the
        // gentle depth blur.
        const blur = isFront ? 0 : depthT * config.depthBlurMax * (1 - easedFrontness)

        card.style.opacity = opacity.toFixed(3)
        // Skip blur on mobile entirely; on desktop write the filter only
        // when the value actually changes (the front card and most side
        // cards hold a steady blur frame-to-frame, so this avoids forcing
        // the GPU to re-rasterise every card on every single frame).
        if (useBlur) {
          const wantFilter = blur < 0.08 ? '' : `blur(${blur.toFixed(2)}px)`
          if (card.__gscFilter !== wantFilter) {
            card.style.filter = wantFilter
            card.__gscFilter = wantFilter
          }
        } else if (card.__gscFilter) {
          // Resized desktop -> mobile: clear any stale blur layer once.
          card.style.filter = ''
          card.__gscFilter = ''
        }
        // Ring position computed in JS: a circle in XZ, leaned back by the
        // ring pitch, riding the carousel yaw. The card itself is a pure
        // translate3d + scale — upright, facing the screen, slice-proof.
        const theta = ((staticAngle + yawBase) * Math.PI) / 180
        const ringX = Math.sin(theta) * radius
        const ringZ = Math.cos(theta) * radius
        const x3 = ringX
        const y3 = -ringZ * sinPitch
        const z3 = ringZ * cosPitch

        card.style.transform = [
          `translate3d(${x3.toFixed(2)}px, ${(y3 + yOffset + ringLift).toFixed(2)}px, ${z3.toFixed(2)}px)`,
          `scale(${scale.toFixed(3)})`,
        ].join(' ')
        card.style.zIndex = String(Math.round((1 - depthT) * 40 + easedFrontness * 100))
        card.style.pointerEvents = isFront ? 'auto' : 'none'
        card.dataset.front = isFront ? 'true' : 'false'

        if (button) {
          button.tabIndex = isFront ? 0 : -1
        }
      }

      if (nextActive !== lastActiveRef.current) {
        lastActiveRef.current = nextActive
        setActiveIndex(nextActive)
      }
    }

    // Event-driven rendering: the coil's output depends ONLY on the scroll
    // progress and the mouse position, so there is nothing to animate while
    // both are still. The old free-running rAF loop re-wrote 16–30 cards'
    // styles every frame even when idle (measured ~90% main-thread busy on
    // a throttled phone); now a frame is rendered only when ScrollTrigger's
    // onUpdate or a pointermove actually changes the inputs.
    const requestRender = () => {
      if (!inView || raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        renderFrame()
      })
    }

    const startLoop = () => {
      inView = true
      // Hide the global flying/perched ornaments while this full-screen coil is
      // the active view — they'd otherwise drift over the centre photo. The
      // gallery's own left/right bouquet stays (it's not part of that layer).
      document.body.classList.add('lb-gallery-active')
      // Sync render BEFORE the next paint — guarantees the first
      // paint after re-enter shows the correct coil layout, fixing the
      // "stuck at top" / "cards flat" bug where the browser would paint
      // a stale transform before the next rAF tick.
      renderFrame()
    }

    const stopLoop = () => {
      inView = false
      document.body.classList.remove('lb-gallery-active')
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true)
          setGallerySketchVisible(true)
          startLoop()
        }
      },
      { threshold: 0.05 },
    )

    observer.observe(section)

    const onPointerMove = (event) => {
      const rect = scene.getBoundingClientRect()
      mouse.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      }
      requestRender()
    }

    const onPointerLeave = () => {
      mouse.current = { x: 0.5, y: 0.5 }
      requestRender()
    }

    // Mouse parallax is a hover affordance — on touch devices pointermove
    // only fires mid-swipe and just burned getBoundingClientRect reads.
    const hoverCapable = !window.matchMedia('(hover: none)').matches
    if (hoverCapable) {
      scene.addEventListener('pointermove', onPointerMove)
      scene.addEventListener('pointerleave', onPointerLeave)
    }

    // iPad orientation flip (landscape⇄portrait) is the classic breaker here:
    // iPadOS reports the new innerWidth/innerHeight a beat AFTER the
    // orientationchange event, so GSAP's own resize-refresh recomputes the
    // pinned spacer + start/end against the stale (pre-rotation) viewport.
    // The pin range ends up wrong and the coil appears frozen. We refresh
    // again once the dimensions have actually settled. A double-rAF + short
    // timeout covers both the immediate resize and the late iPad report.
    let refreshTimer = 0
    const refreshNow = () => {
      // Re-evaluate the active range and kick the loop if we're pinned, so
      // the coil never sits frozen after the layout recalculates.
      ScrollTrigger.refresh()
    }
    const handleViewportChange = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(refreshNow, 320)
    }
    window.addEventListener('orientationchange', handleViewportChange)
    window.addEventListener('resize', handleViewportChange)
    // visualViewport fires on the iPad URL-bar/keyboard resize too, which is
    // exactly when the pin height drifts — listen if available.
    window.visualViewport?.addEventListener('resize', handleViewportChange)

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${total * config.scrollPerPhoto}`,
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          setGallerySketchVisible(true)
          startLoop()
        },
        onEnterBack: () => {
          setGallerySketchVisible(true)
          startLoop()
        },
        onLeave: () => {
          stopLoop()
          setGallerySketchVisible(false)
          // Don't reset — cards keep their last computed state. When the
          // section re-enters, startLoop()'s sync renderFrame() will
          // immediately update them to the correct progress=0 state on
          // the first paint, so there's no "stuck at top" flash.
        },
        onLeaveBack: () => {
          stopLoop()
          setGallerySketchVisible(false)
        },
        onUpdate: (self) => {
          scrollProgress.current = self.progress
          inView = true
          requestRender()
        },
        onRefresh: (self) => {
          // After GSAP recalculates on viewport resize/orientation flip,
          // re-sync progress to the corrected pin range and restart the loop
          // if the section is currently in its active range — otherwise the
          // coil would paint a stale frame (or none) and look frozen.
          scrollProgress.current = self.progress
          if (self.isActive) {
            inView = true
            startLoop()
          }
        },
      })
    }, section)

    const rect = section.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setHasEntered(true)
      startLoop()
    }

    return () => {
      // Drop the gallery flag so the global ornaments aren't left hidden if the
      // section unmounts while it was the active view (e.g. editor remount).
      document.body.classList.remove('lb-gallery-active')
      observer.disconnect()
      scene.removeEventListener('pointermove', onPointerMove)
      scene.removeEventListener('pointerleave', onPointerLeave)
      window.clearTimeout(refreshTimer)
      window.removeEventListener('orientationchange', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      if (raf) cancelAnimationFrame(raf)
      ctx.revert()
    }
  }, [config, total])

  // Lock page scroll while the lightbox is open. The section underneath is
  // pinned + scrubbed — without the lock, wheel/touch scrolling behind the
  // modal kept rotating the coil (and could unpin it entirely), so closing
  // the lightbox dropped the guest somewhere else on the page.
  const lightboxOpen = lightboxIndex !== null
  useEffect(() => {
    if (!lightboxOpen) return undefined
    const html = document.documentElement
    const prevHtml = html.style.overflow
    const prevBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    // overflow:hidden alone is not enough here: Lenis turns wheel events
    // into PROGRAMMATIC scrolls (window.scrollTo), which overflow:hidden
    // does not block. Intercept wheel/touchmove in the capture phase so
    // neither the native scroll nor Lenis's window-level listener runs.
    const blockScroll = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true })
    return () => {
      html.style.overflow = prevHtml
      document.body.style.overflow = prevBody
      window.removeEventListener('wheel', blockScroll, { capture: true })
      window.removeEventListener('touchmove', blockScroll, { capture: true })
    }
  }, [lightboxOpen])

  // Lightbox keyboard controls.
  useEffect(() => {
    if (lightboxIndex === null || total === 0) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setLightboxIndex(null)
      if (event.key === 'ArrowLeft') setLightboxIndex((index) => (index - 1 + total) % total)
      if (event.key === 'ArrowRight') setLightboxIndex((index) => (index + 1) % total)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxIndex, total])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: COMPONENT_STYLES }} />
      <section ref={setSectionRef} className="gsc-section" aria-label={sectionTitle}>
        <div ref={sceneRef} className="gsc-scene">
          <BotanicalSketchLayer
            seed={gallerySketchSeed}
            fixed={false}
            hiddenBelow={520}
            color="var(--accent, #6b5c4a)"
            desktopOpacity={0.22}
            tabletOpacity={0.16}
            desktopWidth="clamp(120px, 14vw, 220px)"
            tabletWidth="clamp(70px, 12vw, 120px)"
            leftId="gallery-botanical-left"
            rightId="gallery-botanical-right"
            zIndex={2}
            scrollTrigger={sectionElement}
            animateOnScroll={false}
            visible={gallerySketchVisible}
            style={{ position: 'absolute' }}
          />

          {/* Ornament motif locked to the LEFT & RIGHT edges (centre stays clear
              of the focal photo), via the shared SceneFrame — the SAME edge
              treatment as RSVP / footer. Retinted to --accent for the gallery
              by the .gsc-scene override in COMPONENT_STYLES (SceneFrame defaults
              to --button-fg, meant for accent-bg sections, not the gallery bg). */}
          <SceneFrame />

          <div className="gsc-stage">
            <div className="gsc-coilAnchor">
              <div ref={coilRef} className="gsc-coil">
                {displayPhotos.map((photo, index) => (
                  <CoilPhoto
                    key={photo.id}
                    photo={photo}
                    index={index}
                    config={config}
                    cardRef={setCardRef(index)}
                    hasEntered={hasEntered}
                    onOpen={setLightboxIndex}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="gsc-vignette" aria-hidden="true" />
          <div className="gsc-fade" aria-hidden="true" />

          {(sectionTitle || sectionSubtitle || demoNote) && (
            <header className="gsc-header">
              {sectionTitle && <h2 className="gsc-title">{sectionTitle}</h2>}
              {sectionSubtitle && <p className="gsc-subtitle">{sectionSubtitle}</p>}
              {/* Demo previews only — explains that a real invitation picks ONE gallery style. */}
              {demoNote && <p className="gsc-demoNote">{demoNote}</p>}
            </header>
          )}

          {total > 0 && (
            <div className="gsc-counter" aria-live="polite">
              <p className="gsc-count">FOTO {activeIndex + 1} DARI {total}</p>
              <div className="gsc-dots" aria-hidden="true">
                {displayPhotos.map((photo, index) => (
                  <span
                    key={photo.id}
                    className={index === activeIndex ? 'gsc-dot gsc-dotActive' : 'gsc-dot'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {lightboxPhoto && lightboxIndex !== null && (
          <motion.div
            className="gsc-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxPhoto.caption || `Foto ${lightboxIndex + 1}`}
            onClick={() => setLightboxIndex(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <button
              type="button"
              className="gsc-lightboxButton gsc-close"
              onClick={(event) => {
                event.stopPropagation()
                setLightboxIndex(null)
              }}
              aria-label="Tutup lightbox"
            >
              x
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  className="gsc-lightboxButton gsc-prev"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLightboxIndex((lightboxIndex - 1 + total) % total)
                  }}
                  aria-label="Foto sebelumnya"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="gsc-lightboxButton gsc-next"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLightboxIndex((lightboxIndex + 1) % total)
                  }}
                  aria-label="Foto berikutnya"
                >
                  &gt;
                </button>
              </>
            )}

            <motion.figure
              className="gsc-lightboxFigure"
              onClick={(event) => event.stopPropagation()}
              initial={{ scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.86, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 190, damping: 22 }}
            >
              {lightboxPhoto.src ? (
                <img
                  className="gsc-lightboxImage"
                  src={lightboxPhoto.full || lightboxPhoto.src}
                  alt={lightboxPhoto.caption || `Foto ${lightboxIndex + 1}`}
                />
              ) : (
                <span className="gsc-placeholder">foto {lightboxIndex + 1}</span>
              )}
              {lightboxPhoto.caption && (
                <figcaption className="gsc-lightboxCaption">
                  {lightboxPhoto.caption}
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
