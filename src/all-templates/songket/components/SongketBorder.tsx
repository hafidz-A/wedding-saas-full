'use client'

import React, { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ============================================================================
   SongketBorder — the left/right edge band (Lovebirds' BotanicalBorder slot).

   Instead of sketched flower stems it weaves a songket selvedge: a double gold
   rail, a run of pucuk-rebung (tumpal) triangles pointing inward, a chain of
   bintang-berantai diamonds, and ukiran "simbar" fern curls with the odd
   melati. Every stroke is a `data-draw` path, so the inherited draw-in
   animation reads as gold thread being woven down the page on each section
   change. Seeded per section, so the curls shift a little between sections.
   ============================================================================ */

// Constant-height unit for fixed decorative layers: `lvh` ignores the mobile
// URL bar collapsing/expanding (which resizes anything inset/percent-sized and
// forces a full re-raster mid-scroll). Falls back to `vh` (also bar-stable in
// modern browsers) where `lvh` isn't supported.
const STABLE_VIEWPORT_HEIGHT =
  typeof CSS !== 'undefined' && CSS.supports?.('height', '100lvh') ? '100lvh' : '100vh'

type Curl = { y: number; flip: boolean; scale: number; flower: boolean }

type SongketSketchLayerProps = {
  seed?: number
  fixed?: boolean
  hiddenBelow?: number
  color?: string
  desktopOpacity?: number
  tabletOpacity?: number
  mobileOpacity?: number
  desktopWidth?: string
  tabletWidth?: string
  mobileWidth?: string
  leftId?: string
  rightId?: string
  zIndex?: number
  animateOnScroll?: boolean
  scrollTrigger?: Element | null
  activeSection?: string
  visible?: boolean
  style?: React.CSSProperties
}

function mulberry32(seed: number) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getInitialSectionId() {
  if (typeof document === 'undefined') return 'hero'
  return document.querySelector<HTMLElement>('[data-section]')?.dataset.section || 'hero'
}

const CURL_COUNT = 7

function generateCurls(seed: number, count: number = CURL_COUNT): Curl[] {
  const rng = mulberry32(seed)
  return Array.from({ length: count }, (_, i) => ({
    y: 60 + i * (800 / count) + rng() * 40,
    flip: rng() > 0.5,
    scale: 0.85 + rng() * 0.45,
    flower: rng() > 0.45,
  }))
}

function drawPath(d: string, key: string, strokeWidth = 0.82) {
  return (
    <path
      key={key}
      d={d}
      data-draw="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/** One simbar fern curl growing out from the diamond chain, optionally ending
 *  in a small melati. Drawn around (0,0) and placed by the caller. */
function drawCurl(curl: Curl, key: string) {
  const sy = curl.flip ? -1 : 1
  return (
    <g key={key} transform={`translate(68 ${curl.y.toFixed(1)}) scale(${curl.scale.toFixed(2)} ${(sy * curl.scale).toFixed(2)})`}>
      {drawPath('M0 0 C20 -10 40 -4 44 14 C47 28 34 34 28 26 C23 19 30 13 35 18', `${key}-c`, 0.9)}
      {drawPath('M12 -2 C10 -16 24 -24 32 -20 C28 -10 20 -4 12 -2', `${key}-l`, 0.8)}
      {drawPath('M20 6 C26 18 22 30 14 34', `${key}-t`, 0.7)}
      {curl.flower && (
        <g transform="translate(14 38)">
          {[0, 72, 144, 216, 288].map((r) => (
            <g key={r} transform={`rotate(${r})`}>
              {drawPath('M0 0 C-3 -4 -3 -9 0 -11 C3 -9 3 -4 0 0', `${key}-p${r}`, 0.7)}
            </g>
          ))}
        </g>
      )}
    </g>
  )
}

function SongketSvg({ id, curls, sideStyle }: { id: string; curls: Curl[]; sideStyle: React.CSSProperties }) {
  const rows = Array.from({ length: 23 }, (_, i) => i * 40)
  const knots = Array.from({ length: 15 }, (_, i) => 30 + i * 60)
  return (
    <svg
      id={id}
      style={sideStyle}
      viewBox="0 0 160 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* x 0–26 is left to the static woven selvedge (.sk-anyaman-side) */}
      {drawPath('M28 0 V900', 'rail-a', 1.3)}
      {drawPath('M34 0 V900', 'rail-b', 0.7)}
      {rows.map((y) => (
        <g key={`t-${y}`}>
          {drawPath(`M34 ${y} L56 ${y + 20} L34 ${y + 40}`, `t-${y}-o`, 0.9)}
          {drawPath(`M34 ${y + 10} L46 ${y + 20} L34 ${y + 30}`, `t-${y}-i`, 0.6)}
        </g>
      ))}
      {knots.map((y, i) => (
        <g key={`k-${y}`}>
          {drawPath(`M68 ${y - 8} L74 ${y} L68 ${y + 8} L62 ${y} Z`, `k-${y}-d`, 0.9)}
          {i < knots.length - 1 && drawPath(`M68 ${y + 8} V${y + 52}`, `k-${y}-l`, 0.5)}
        </g>
      ))}
      {curls.map((c, i) => drawCurl(c, `curl-${i}`))}
    </svg>
  )
}

export const SongketSketchLayer = React.memo(({
  seed,
  fixed = false,
  hiddenBelow = 0,
  color = 'var(--accent, #6b5c4a)',
  desktopOpacity = 0.6,
  tabletOpacity = 0.5,
  mobileOpacity = 0.35,
  desktopWidth = 'clamp(110px, 11vw, 170px)',
  tabletWidth = 'clamp(80px, 9vw, 120px)',
  mobileWidth = 'clamp(56px, 14vw, 88px)',
  leftId = 'songket-left',
  rightId = 'songket-right',
  zIndex = 1,
  animateOnScroll = true,
  scrollTrigger = null,
  activeSection,
  visible = true,
  style,
}: SongketSketchLayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasEnteredRef = useRef(false)
  // MUST start at the same value on server and first client render — reading
  // window.innerWidth in the initializer made SSR emit the desktop width
  // (clamp(120px…)) while a phone hydrated with the mobile width, throwing a
  // React hydration-mismatch error on every mobile load. The ResizeObserver
  // below fires once on observe and corrects the width right after mount.
  const [windowWidth, setWindowWidth] = useState(1024)

  const resolvedSeed = useMemo(() => seed ?? Date.now(), [seed])
  // Phones render fewer stems: each stem is dozens of stroked paths across a
  // 100vh layer, and rastering two of those at DPR 3 was a measured FPS sink.
  const curlCount = windowWidth < 768 ? 4 : CURL_COUNT
  const curls = useMemo(() => generateCurls(resolvedSeed, curlCount), [resolvedSeed, curlCount])

  const svgWidth = windowWidth < 480
    ? mobileWidth
    : windowWidth < 768
      ? tabletWidth
      : desktopWidth
  const borderOpacity = windowWidth < 480
    ? mobileOpacity
    : windowWidth < 768 ? tabletOpacity : desktopOpacity
  const isHidden = windowWidth < hiddenBelow
  const shouldHideBeforeFirstAnimation = !hasEnteredRef.current && (!visible || !animateOnScroll)

  const baseSvgStyle = {
    position: 'absolute',
    top: 0,
    width: svgWidth,
    height: '100vh',
    overflow: 'hidden',
    willChange: 'transform',
  } satisfies React.CSSProperties

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined

    const resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect?.width ?? window.innerWidth
      setWindowWidth(Math.round(nextWidth))
    })

    resizeObserver.observe(document.documentElement)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || isHidden) return undefined

    const content = contentRef.current
    const paths = Array.from(container.querySelectorAll<SVGPathElement>('path[data-draw="true"]'))

    // READ phase — measure every path ONCE, before any style write below.
    // Interleaving getTotalLength()/getBBox() with gsap.set() forced a full-
    // page reflow per path (profiled at ~9.5s total under 6× CPU throttle):
    // every layer swap at a section boundary froze Lenis mid-fling — the
    // "scroll ketahan antara section" jank. Path geometry never changes after
    // mount, so lengths are safe to cache for the effect's whole lifetime
    // (including the function-valued tween lookups further down).
    const pathLengths = new Map<SVGPathElement, number>()
    const pathTops = new Map<SVGPathElement, number>()
    paths.forEach((path) => {
      pathLengths.set(path, path.getTotalLength?.() ?? 100)
      pathTops.set(path, path.getBBox?.()?.y ?? 0)
    })
    const pathsTopToBottom = [...paths].sort(
      (a, b) => (pathTops.get(a) ?? 0) - (pathTops.get(b) ?? 0),
    )
    const animations: gsap.core.Tween[] = []
    const getPathLength = (path: SVGPathElement) => pathLengths.get(path) ?? 100

    // WRITE phase — everything from here on only writes styles. Static path
    // styles are written DIRECTLY (path.style.*), not via gsap.set: GSAP's
    // CSSPlugin reads the current computed value before writing, which
    // re-created the same read-write thrash inside the loop (profiled as
    // ~8.8s of _getComputedProperty forced reflow under 6× throttle). The
    // inline values also make the later gsap.to() tween inits read cheap
    // inline styles instead of forcing computed-style flushes.
    gsap.killTweensOf([content, ...paths])

    paths.forEach((path) => {
      path.style.strokeDasharray = String(getPathLength(path))
    })

    if (!visible) {
      if (!hasEnteredRef.current) {
        gsap.set(content, { opacity: 0, y: 18 })
        paths.forEach((path) => {
          path.style.strokeDashoffset = String(getPathLength(path))
          path.style.opacity = '0'
        })

        return undefined
      }

      animations.push(
        gsap.to(pathsTopToBottom, {
          strokeDashoffset: (_index, path: SVGPathElement) => getPathLength(path),
          opacity: 0,
          duration: 1.45,
          ease: 'power2.inOut',
          stagger: {
            each: 0.018,
            from: 'start',
          },
        }),
      )

      animations.push(
        gsap.to(content, {
          opacity: 0,
          y: 24,
          duration: 1.65,
          ease: 'power2.inOut',
        }),
      )

      return () => {
        animations.forEach((animation) => animation.kill())
      }
    }

    hasEnteredRef.current = true

    if (animateOnScroll) {
      paths.forEach((path, i) => {
        path.style.strokeDashoffset = String(getPathLength(path))
        path.style.opacity = '1'

        animations.push(
          gsap.to(path, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: scrollTrigger ?? document.body,
            start: scrollTrigger ? 'top 78%' : `${(i / paths.length) * 60}% top`,
            end: scrollTrigger ? 'bottom 22%' : `${(i / paths.length) * 60 + 20}% top`,
            scrub: scrollTrigger ? 2 : 3,
          },
          }),
        )
      })

      animations.push(
        gsap.fromTo(
          content,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 1.2,
            ease: 'power2.out',
            delay: 0.2,
          },
        ),
      )
    } else {
      gsap.set(content, { opacity: 0, y: -14 })
      paths.forEach((path) => {
        path.style.strokeDashoffset = String(getPathLength(path))
        path.style.opacity = '0'
      })

      animations.push(
        gsap.to(content, {
          opacity: 1,
          y: 0,
          duration: 1.15,
          ease: 'power2.out',
        }),
        gsap.to(pathsTopToBottom, {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 1.45,
          ease: 'power2.out',
          stagger: {
            each: 0.016,
            from: 'start',
          },
        }),
      )
    }

    return () => {
      animations.forEach((animation) => {
        animation.scrollTrigger?.kill()
        animation.kill()
      })
    }
  }, [animateOnScroll, isHidden, resolvedSeed, scrollTrigger, visible])

  return (
    <div
      ref={containerRef}
      data-botanical-seed={resolvedSeed}
      data-active-section={activeSection}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        // Stable height for the fixed case (not `inset: 0`): an inset-sized
        // fixed layer tracks the live viewport, so mobile URL-bar show/hide
        // resized + re-rastered this whole sketch layer mid-scroll. lvh is
        // constant regardless of the bar state (iOS 15.4+/Chrome 108+).
        top: 0,
        left: 0,
        right: 0,
        bottom: fixed ? undefined : 0,
        height: fixed ? STABLE_VIEWPORT_HEIGHT : undefined,
        pointerEvents: 'none',
        zIndex,
        overflow: 'hidden',
        display: isHidden ? 'none' : 'block',
        color,
        opacity: borderOpacity,
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        ref={contentRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: shouldHideBeforeFirstAnimation ? 0 : undefined,
        }}
      >
        <SongketSvg
          id={leftId}
          curls={curls}
          sideStyle={{
            ...baseSvgStyle,
            left: 0,
          }}
        />
        <SongketSvg
          id={rightId}
          curls={curls}
          sideStyle={{
            ...baseSvgStyle,
            right: 0,
            transform: 'scaleX(-1)',
          }}
        />
      </div>
    </div>
  )
})

SongketSketchLayer.displayName = 'SongketSketchLayer'

export const SongketBorder = React.memo(() => {
  const sessionSeed = useMemo(() => Date.now(), [])
  const initialSection = useMemo(() => getInitialSectionId(), [])
  const activeSectionRef = useRef(initialSection)
  const pendingTimerRef = useRef<number | null>(null)
  const [activeSection, setActiveSection] = useState(initialSection)
  const sectionSeed = useMemo(
    () => (sessionSeed + hashString(activeSection)) >>> 0,
    [activeSection, sessionSeed],
  )
  const [layers, setLayers] = useState(() => [
    {
      key: initialSection,
      section: initialSection,
      seed: (sessionSeed + hashString(initialSection)) >>> 0,
      leaving: false,
    },
  ])

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
    if (!sections.length) return undefined

    const findStableSection = () => {
      const viewportHeight = window.innerHeight
      const stableTop = viewportHeight * 0.22
      const stableBottom = viewportHeight * 0.78
      const stableThreshold = Math.min(300, (stableBottom - stableTop) * 0.62)

      const scoredSections = sections.map((section) => {
        const rect = section.getBoundingClientRect()
        const overlap = Math.max(
          0,
          Math.min(rect.bottom, stableBottom) - Math.max(rect.top, stableTop),
        )

        return {
          id: section.dataset.section || initialSection,
          overlap,
        }
      })

      const best = scoredSections.reduce((currentBest, section) => (
        section.overlap > currentBest.overlap ? section : currentBest
      ), { id: initialSection, overlap: 0 })

      return best.overlap > stableThreshold ? best.id : null
    }

    // Swap the sketch only when scrolling is IDLE. The swap remounts a
    // full-height SVG layer (React commit + style/layout + raster of dozens of
    // stroked paths) — doing that MID-FLING froze the scroll at section
    // boundaries even after the reflow-thrash fix above. Decor can wait: the
    // sketch now updates the moment the finger/wheel rests, and the stable
    // section is recomputed AT COMMIT TIME so a long fling lands on the
    // section the user actually stopped at, not the one mid-flight.
    const IDLE_MS = 240
    let lastScrollTs = 0
    const onAnyScroll = () => { lastScrollTs = performance.now() }
    window.addEventListener('scroll', onAnyScroll, { passive: true })

    const scheduleIdleCommit = () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
      }
      pendingTimerRef.current = window.setTimeout(() => {
        pendingTimerRef.current = null
        if (performance.now() - lastScrollTs < IDLE_MS) {
          scheduleIdleCommit()
          return
        }
        const stableSectionId = findStableSection()
        if (!stableSectionId || stableSectionId === activeSectionRef.current) return
        setActiveSection(stableSectionId)
      }, IDLE_MS)
    }

    const observer = new IntersectionObserver(() => {
      scheduleIdleCommit()
    }, {
      root: null,
      rootMargin: '-22% 0px -22% 0px',
      // Reduce threshold from 51 points to 5 points to save CPU on scroll
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    })

    sections.forEach((section) => observer.observe(section))
    // Initial commit: nothing has scrolled yet, resolve the section directly.
    const initialStable = findStableSection()
    if (initialStable && initialStable !== activeSectionRef.current) {
      setActiveSection(initialStable)
    }

    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
      }
      window.removeEventListener('scroll', onAnyScroll)
      observer.disconnect()
    }
  }, [initialSection])

  useEffect(() => {
    setLayers((currentLayers) => {
      const currentTop = currentLayers[currentLayers.length - 1]
      if (currentTop?.section === activeSection && !currentTop.leaving) return currentLayers

      const nextLayer = {
        key: `${activeSection}-${sectionSeed}-${Date.now()}`,
        section: activeSection,
        seed: sectionSeed,
        leaving: false,
      }

      // Phones: swap layers instantly instead of crossfading — the crossfade
      // keeps TWO full-height SVG layers alive for ~1.85s per section change,
      // which doubled the raster load exactly while the page is scrolling.
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
        return [nextLayer]
      }

      return [
        ...currentLayers.slice(-1).map((layer) => ({ ...layer, leaving: true })),
        nextLayer,
      ]
    })
  }, [activeSection, sectionSeed])

  useEffect(() => {
    if (!layers.some((layer) => layer.leaving)) return undefined

    const timeout = window.setTimeout(() => {
      setLayers((currentLayers) => currentLayers.filter((layer) => !layer.leaving))
    }, 1850)

    return () => window.clearTimeout(timeout)
  }, [layers])

  // Decorative + non-deterministic (seeds from Date.now(), sizing from
  // window). Render client-only so the server HTML is empty and there's no
  // hydration mismatch on the randomized SVG paths.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <>
      {/* Woven selvedge (anyaman) down both outer edges — static, under the
          animated rails/curls. Mask tile from scripts/gen-songket-motifs.mjs. */}
      <div className="sk-anyaman sk-anyaman-side sk-anyaman-side--l" aria-hidden="true" />
      <div className="sk-anyaman sk-anyaman-side sk-anyaman-side--r" aria-hidden="true" />
      {layers.map((layer, index) => {
        const isTopLayer = index === layers.length - 1 && !layer.leaving

        return (
          <SongketSketchLayer
            key={layer.key}
            seed={layer.seed}
            fixed
            leftId={isTopLayer ? 'songket-left' : `songket-left-${layer.key}`}
            rightId={isTopLayer ? 'songket-right' : `songket-right-${layer.key}`}
            activeSection={isTopLayer ? activeSection : undefined}
            animateOnScroll={false}
            visible={!layer.leaving}
          />
        )
      })}
    </>
  )
})

SongketBorder.displayName = 'SongketBorder'
