'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BotanicalSketchLayer } from '../../components/BotanicalBorder.tsx'

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
    // Ring widens with N: circumference ≈ N × cardWidth × 1.05, clamped so
    // small sets still look like a ring and huge sets don't blow the stage.
    radius: Math.max(260, Math.min(560, (safeN * cardWidth * 1.05) / (2 * Math.PI))),
    // The RING leans back a touch so its circular path is visible on screen;
    // the cards themselves counter-rotate and stay perfectly upright.
    ringTiltX: 14,
    cardWidth,
    cardHeight,
    frontScale: 1.12,
    neighborGap: 56,
    depthOpacityMin: 0.12,
    depthBlurMax: 3.0,
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

/* ── Romantic bouquet silhouettes framing the scene at left & right.
   mix-blend-mode multiply ties them visually to the cream background
   without harsh edges. Photos that swing to the edges blend through
   the silhouette organically. */
.gsc-bouquet {
  position: absolute;
  bottom: -4%;
  height: clamp(320px, 64vh, 580px);
  width: auto;
  aspect-ratio: 200 / 320;
  /* No 'color' override — children carry their own fill hex so the bouquet
     reads as colourful flowers rather than a monochrome silhouette. */
  opacity: 0.55;
  pointer-events: none;
  z-index: 35;
  /* mix-blend-mode removed — multiply was muting the colours into greys */
}

.gsc-bouquet svg { width: 100%; height: 100%; display: block; }

.gsc-bouquetLeft {
  left: -5%;
  transform: rotate(-10deg);
  transform-origin: bottom right;
}

.gsc-bouquetRight {
  right: -5%;
  transform: rotate(10deg) scaleX(-1);
  transform-origin: bottom left;
}

@media (max-width: 760px) {
  .gsc-bouquet { height: clamp(260px, 52vh, 400px); opacity: 0.5; }
  .gsc-bouquetLeft  { left: -14%; }
  .gsc-bouquetRight { right: -14%; }
}

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
  will-change: transform, opacity, filter;
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
    src: photo.src || '',
    caption: photo.caption || photo.alt || '',
  }))
}

function clampIndex(index, total) {
  return Math.max(0, Math.min(total - 1, index))
}

/**
 * Blooming bouquet — replaces the old static silhouette. Stems & ribbon
 * fade in first, then four flower clusters bloom from the base up to the
 * crown, each cluster scaling from 0.3→1 with a stagger so the bouquet
 * grows "from stem to crown" as the section enters viewport. Stacks many
 * overlapping circles per cluster to give a packed 3D appearance.
 *
 * `animate` flips true once the parent section enters the viewport (via
 * the existing IntersectionObserver in GallerySpringCoil).
 */
function BloomingBouquet({ animate }) {
  const clusterTransition = (delay) => ({
    duration: 0.85,
    delay,
    ease: [0.16, 1, 0.3, 1],
  })

  // Colour palette — botanical hues that read as a wedding bouquet:
  //   stems/ribbon → sage green
  //   leaves       → deeper sage
  //   cluster 1    → blush roses (pink/rose)
  //   cluster 2    → lavender / lilac
  //   cluster 3    → peach / apricot
  //   crown        → sunlit yellow
  const c = {
    stem:        '#6b8e5f',
    ribbon:      '#7d9c6f',
    leaf:        '#5e8755',
    roseOuter:   '#c9577a',
    roseInner:   '#ee9eb3',
    lavOuter:    '#7c5fa5',
    lavInner:    '#b8a3da',
    peachOuter:  '#d9854c',
    peachInner:  '#f6b884',
    crownOuter:  '#caa636',
    crownInner:  '#f3c95a',
  }

  return (
    <svg viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      {/* Base: stems + ribbon — fades in first */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={animate ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <g stroke={c.stem} strokeWidth="2.2" fill="none" opacity="0.8" strokeLinecap="round">
          <path d="M 100 230 C 90 260 78 290 66 320" />
          <path d="M 100 230 L 100 320" />
          <path d="M 100 230 C 110 260 122 290 134 320" />
        </g>
        <path d="M 76 245 L 124 245 L 121 275 L 79 275 Z" fill={c.ribbon} opacity="0.75" />
        <path d="M 70 240 Q 58 258 64 285 Q 76 275 79 260 Z" fill={c.ribbon} opacity="0.55" />
        <path d="M 130 240 Q 142 258 136 285 Q 124 275 121 260 Z" fill={c.ribbon} opacity="0.55" />
      </motion.g>

      {/* Leaves — frame the bouquet */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={animate ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        fill={c.leaf}
      >
        <ellipse cx="46"  cy="190" rx="14" ry="44" opacity="0.6" transform="rotate(-32 46 190)" />
        <ellipse cx="154" cy="190" rx="14" ry="44" opacity="0.6" transform="rotate(32 154 190)" />
        <ellipse cx="30"  cy="135" rx="11" ry="34" opacity="0.5" transform="rotate(-55 30 135)" />
        <ellipse cx="170" cy="135" rx="11" ry="34" opacity="0.5" transform="rotate(55 170 135)" />
        <ellipse cx="74"  cy="225" rx="9"  ry="22" opacity="0.55" transform="rotate(-20 74 225)" />
        <ellipse cx="126" cy="225" rx="9"  ry="22" opacity="0.55" transform="rotate(20 126 225)" />
      </motion.g>

      {/* Cluster 1 — base roses (pink/rose) */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3, y: 40 }}
        animate={animate ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 40 }}
        transition={clusterTransition(0.55)}
        style={{ transformOrigin: '100px 210px', transformBox: 'fill-box' }}
      >
        <circle cx="100" cy="210" r="24" fill={c.roseOuter} opacity="0.7" />
        <circle cx="100" cy="210" r="14" fill={c.roseInner} />
        <circle cx="74"  cy="214" r="20" fill={c.roseOuter} opacity="0.65" />
        <circle cx="74"  cy="214" r="12" fill={c.roseInner} />
        <circle cx="126" cy="214" r="20" fill={c.roseOuter} opacity="0.65" />
        <circle cx="126" cy="214" r="12" fill={c.roseInner} />
        <circle cx="58"  cy="225" r="14" fill={c.roseOuter} opacity="0.55" />
        <circle cx="142" cy="225" r="14" fill={c.roseOuter} opacity="0.55" />
      </motion.g>

      {/* Cluster 2 — middle lavender (purple) */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3, y: 30 }}
        animate={animate ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 30 }}
        transition={clusterTransition(0.85)}
        style={{ transformOrigin: '100px 160px', transformBox: 'fill-box' }}
      >
        <circle cx="100" cy="150" r="24" fill={c.lavOuter} opacity="0.7" />
        <circle cx="100" cy="150" r="14" fill={c.lavInner} />
        <circle cx="72"  cy="165" r="19" fill={c.lavOuter} opacity="0.65" />
        <circle cx="72"  cy="165" r="12" fill={c.lavInner} />
        <circle cx="128" cy="165" r="19" fill={c.lavOuter} opacity="0.65" />
        <circle cx="128" cy="165" r="12" fill={c.lavInner} />
        <circle cx="48"  cy="178" r="13" fill={c.lavOuter} opacity="0.55" />
        <circle cx="152" cy="178" r="13" fill={c.lavOuter} opacity="0.55" />
      </motion.g>

      {/* Cluster 3 — upper peach (apricot) */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3, y: 30 }}
        animate={animate ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 30 }}
        transition={clusterTransition(1.15)}
        style={{ transformOrigin: '100px 110px', transformBox: 'fill-box' }}
      >
        <circle cx="100" cy="105" r="22" fill={c.peachOuter} opacity="0.75" />
        <circle cx="100" cy="105" r="13" fill={c.peachInner} />
        <circle cx="78"  cy="118" r="17" fill={c.peachOuter} opacity="0.65" />
        <circle cx="78"  cy="118" r="11" fill={c.peachInner} />
        <circle cx="122" cy="118" r="17" fill={c.peachOuter} opacity="0.65" />
        <circle cx="122" cy="118" r="11" fill={c.peachInner} />
      </motion.g>

      {/* Crown — sunlit yellow at the top */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3, y: 30 }}
        animate={animate ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 30 }}
        transition={clusterTransition(1.45)}
        style={{ transformOrigin: '100px 70px', transformBox: 'fill-box' }}
      >
        <circle cx="100" cy="70" r="24" fill={c.crownOuter} opacity="0.8" />
        <circle cx="100" cy="70" r="15" fill={c.crownInner} />
        <circle cx="100" cy="40" r="16" fill={c.crownOuter} opacity="0.75" />
        <circle cx="100" cy="40" r="10" fill={c.crownInner} />
      </motion.g>
    </svg>
  )
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

    // Performance flags computed once. On mobile we skip the per-frame
    // CSS filter:blur — it's the single most expensive op in the loop
    // (forces fragment re-paint of the whole card every frame). The
    // visual loss is minor; the FPS gain on phones is huge.
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 760px)').matches
    const useBlur = !isMobile

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

      coil.style.transform = `translateY(${riseY}px)`

      for (let index = 0; index < total; index += 1) {
        const card = cardsRef.current[index]
        if (!card) continue

        const button = card.querySelector('.gsc-coilButton')
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
        const blur = depthT * config.depthBlurMax * (1 - easedFrontness)

        card.style.opacity = opacity.toFixed(3)
        // Skip blur on mobile entirely; on desktop only re-write when it
        // changes meaningfully (saves the GPU from re-rasterising the
        // card sub-tree on every single frame).
        if (useBlur) card.style.filter = `blur(${blur.toFixed(2)}px)`
        // Ring position computed in JS: a circle in XZ, leaned back by the
        // ring pitch, riding the carousel yaw. The card itself is a pure
        // translate3d + scale — upright, facing the screen, slice-proof.
        const theta = ((staticAngle + yawBase) * Math.PI) / 180
        const ringX = Math.sin(theta) * config.radius
        const ringZ = Math.cos(theta) * config.radius
        const x3 = ringX
        const y3 = -ringZ * sinPitch
        const z3 = ringZ * cosPitch

        card.style.transform = [
          `translate3d(${x3.toFixed(2)}px, ${(y3 + yOffset).toFixed(2)}px, ${z3.toFixed(2)}px)`,
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

    const applyFrame = () => {
      if (!inView) {
        raf = 0
        return
      }
      renderFrame()
      raf = requestAnimationFrame(applyFrame)
    }

    const startLoop = () => {
      inView = true
      // Sync render BEFORE scheduling the rAF — guarantees the first
      // paint after re-enter shows the correct coil layout, fixing the
      // "stuck at top" / "cards flat" bug where the browser would paint
      // a stale transform before the next rAF tick.
      renderFrame()
      if (!raf) raf = requestAnimationFrame(applyFrame)
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
    }

    const onPointerLeave = () => {
      mouse.current = { x: 0.5, y: 0.5 }
    }

    scene.addEventListener('pointermove', onPointerMove)
    scene.addEventListener('pointerleave', onPointerLeave)

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
          inView = false
          setGallerySketchVisible(false)
          // Don't reset — cards keep their last computed state. When the
          // section re-enters, startLoop()'s sync renderFrame() will
          // immediately update them to the correct progress=0 state on
          // the first paint, so there's no "stuck at top" flash.
        },
        onLeaveBack: () => {
          inView = false
          setGallerySketchVisible(false)
        },
        onUpdate: (self) => {
          scrollProgress.current = self.progress
          startLoop()
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
            color="var(--color-text, #6b5c4a)"
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

          {/* Blooming bouquets framing the coil scene — animate from
              stem to crown when the section enters viewport. */}
          <div className="gsc-bouquet gsc-bouquetLeft" aria-hidden="true">
            <BloomingBouquet animate={hasEntered} />
          </div>
          <div className="gsc-bouquet gsc-bouquetRight" aria-hidden="true">
            <BloomingBouquet animate={hasEntered} />
          </div>

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
                  src={lightboxPhoto.src}
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
