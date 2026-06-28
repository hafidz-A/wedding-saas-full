'use client'

import React, { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const FLOWER_TYPES = [
  'rose',
  'daisy',
  'poppy',
  'lavender',
  'carnation',
  'magnolia',
  'thistle',
  'anemone',
  'tulip',
  'wildberry',
  'fern',
  'daisy2',
]

const STEM_COUNT = 9

type FlowerType = (typeof FLOWER_TYPES)[number]

type Flower = {
  type: FlowerType
  yOffset: number
  xOffset: number
  scale: number
  rotation: number
}

type Stem = {
  x: number
  yStart: number
  yEnd: number
  lean: number
  flowers: Flower[]
}

type BotanicalSketchLayerProps = {
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

function generateStems(seed: number, stemCount: number = STEM_COUNT): Stem[] {
  const rng = mulberry32(seed)

  return Array.from({ length: stemCount }, (_, i) => {
    const yStart = 10 + i * (880 / stemCount)
    const yEnd = yStart + 90 + rng() * 70

    return {
      x: 40 + rng() * 60,
      yStart,
      yEnd,
      lean: (rng() - 0.5) * 38,
      // 3–7 flowers per stem (was 2–5) for a fuller, busier look.
      flowers: Array.from({ length: 3 + Math.floor(rng() * 5) }, () => ({
        type: FLOWER_TYPES[Math.floor(rng() * FLOWER_TYPES.length)] as FlowerType,
        yOffset: rng() * 110,
        xOffset: (rng() - 0.5) * 44,
        scale: 0.75 + rng() * 0.7,
        rotation: (rng() - 0.5) * 36,
      })),
    }
  })
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

function drawFlower(type: FlowerType, cx: number, cy: number, scale: number, rotation: number) {
  const flowerPaths: Record<FlowerType, (id: string) => ReactNode> = {
    rose: (id) => (
      <>
        {drawPath('M0 0 C-6 -7 -13 -4 -12 3 C-6 1 -2 -2 0 0 C2 -7 9 -12 13 -7 C7 -4 3 -1 0 0 C-3 -9 -1 -17 5 -18 C6 -10 4 -4 0 0', `${id}-a`, 0.86)}
        {drawPath('M0 0 C-10 5 -8 14 1 13 C-1 8 -1 4 0 0 M0 0 C9 3 12 11 5 15 C4 9 2 4 0 0', `${id}-b`, 0.74)}
      </>
    ),
    daisy: (id) => (
      <>
        {drawPath('M0 -4 C-3 -13 3 -13 0 -4 M3 -3 C12 -8 14 -2 4 -1 M4 2 C13 5 10 11 2 5 M0 4 C3 13 -3 13 0 4 M-3 3 C-12 8 -14 2 -4 1 M-4 -2 C-13 -5 -10 -11 -2 -5', `${id}-a`, 0.78)}
        {drawPath('M-3 0 A3 3 0 1 0 3 0 A3 3 0 1 0 -3 0', `${id}-b`, 0.74)}
      </>
    ),
    poppy: (id) => (
      <>
        {drawPath('M0 0 C-14 -7 -15 -21 -3 -18 C-2 -10 0 -4 0 0 C8 -18 23 -15 18 -2 C9 -2 3 -1 0 0 C14 8 6 22 -5 16 C-4 8 -2 3 0 0 C-12 11 -23 2 -16 -9 C-8 -6 -3 -3 0 0', `${id}-a`, 0.88)}
        {drawPath('M-3 0 A3 3 0 1 0 3 0 A3 3 0 1 0 -3 0 M-6 -3 L-2 -1 M6 -3 L2 -1 M-5 4 L-1 1 M5 4 L1 1', `${id}-b`, 0.72)}
      </>
    ),
    lavender: (id) => (
      <>
        {drawPath('M0 20 C-3 5 -1 -9 0 -24', `${id}-a`, 0.8)}
        {drawPath('M0 -20 C-8 -22 -8 -14 0 -15 M0 -14 C8 -16 8 -8 0 -9 M0 -8 C-8 -10 -8 -2 0 -3 M0 -2 C8 -4 8 4 0 3 M0 4 C-7 2 -7 10 0 9', `${id}-b`, 0.78)}
      </>
    ),
    carnation: (id) => (
      <>
        {drawPath('M0 0 C-8 -4 -13 -11 -8 -17 C-3 -14 0 -10 0 0 C5 -15 14 -16 15 -8 C9 -5 4 -2 0 0 C10 5 8 15 0 17 C-1 10 -1 4 0 0 C-7 10 -16 5 -13 -3 C-7 -3 -3 -2 0 0', `${id}-a`, 0.86)}
        {drawPath('M-6 -2 C-2 -7 2 -7 6 -2 M-5 5 C-1 2 3 2 7 5 M0 17 C-1 23 -2 27 -4 31', `${id}-b`, 0.72)}
      </>
    ),
    magnolia: (id) => (
      <>
        {drawPath('M0 0 C-9 -11 -5 -25 1 -24 C4 -14 2 -6 0 0 C7 -18 20 -19 19 -7 C11 -5 4 -2 0 0 C12 6 10 19 -2 20 C-1 11 -1 4 0 0 C-13 8 -24 0 -18 -10 C-9 -7 -3 -3 0 0', `${id}-a`, 0.86)}
        {drawPath('M-2 0 C-1 -5 1 -5 2 0 M-6 3 C-2 1 2 1 6 3', `${id}-b`, 0.72)}
      </>
    ),
    thistle: (id) => (
      <>
        {drawPath('M-7 -6 C-8 -18 8 -18 7 -6 C6 3 -6 3 -7 -6 M-10 -10 L-16 -15 M-6 -16 L-8 -24 M0 -18 L0 -27 M6 -16 L8 -24 M10 -10 L16 -15', `${id}-a`, 0.82)}
        {drawPath('M0 2 C0 12 -1 20 -4 28 M-8 3 L-14 9 M8 3 L14 9', `${id}-b`, 0.72)}
      </>
    ),
    anemone: (id) => (
      <>
        {drawPath('M0 -4 C-4 -15 4 -15 0 -4 M4 -2 C16 -9 18 1 5 2 M3 4 C12 14 2 19 -1 6 M-3 4 C-14 14 -19 4 -5 1 M-4 -2 C-16 -8 -10 -17 -1 -5', `${id}-a`, 0.84)}
        {drawPath('M-3 0 A3 3 0 1 0 3 0 A3 3 0 1 0 -3 0 M-6 -2 L-3 -1 M6 -2 L3 -1 M-5 4 L-2 2 M5 4 L2 2', `${id}-b`, 0.72)}
      </>
    ),
    tulip: (id) => (
      <>
        {drawPath('M0 0 C-11 -9 -12 -23 -5 -25 C-2 -15 0 -8 0 0 C3 -16 11 -20 15 -12 C10 -5 5 -1 0 0 C-3 -16 -11 -20 -15 -12 C-10 -5 -5 -1 0 0', `${id}-a`, 0.86)}
        {drawPath('M0 0 C0 10 -1 18 -4 27 M-4 13 C-13 10 -13 2 -4 5 M3 13 C12 8 14 1 4 5', `${id}-b`, 0.72)}
      </>
    ),
    wildberry: (id) => (
      <>
        {drawPath('M0 18 C-1 7 1 -6 4 -18 M4 -18 C-5 -17 -8 -10 -1 -8 M3 -10 C12 -8 13 -1 5 0 M1 0 C-8 1 -8 8 0 8', `${id}-a`, 0.78)}
        {drawPath('M-5 -16 A3 3 0 1 0 1 -16 A3 3 0 1 0 -5 -16 M7 -8 A3 3 0 1 0 13 -8 A3 3 0 1 0 7 -8 M-5 4 A3 3 0 1 0 1 4 A3 3 0 1 0 -5 4', `${id}-b`, 0.72)}
      </>
    ),
    fern: (id) => (
      <>
        {drawPath('M0 28 C2 10 1 -5 -2 -24', `${id}-a`, 0.78)}
        {drawPath('M-1 -18 C-11 -21 -15 -16 -4 -14 M0 -11 C10 -14 14 -9 3 -7 M0 -4 C-10 -7 -15 -2 -2 0 M1 4 C11 1 15 7 3 8 M1 12 C-9 10 -13 16 -1 16', `${id}-b`, 0.72)}
      </>
    ),
    daisy2: (id) => (
      <>
        {drawPath('M0 -3 C-2 -11 2 -11 0 -3 M3 -2 C10 -8 13 -4 4 1 M3 3 C8 11 3 14 0 5 M-3 3 C-10 10 -13 3 -4 0 M-3 -2 C-10 -8 -5 -13 0 -4', `${id}-a`, 0.82)}
        {drawPath('M-2 0 A2 2 0 1 0 2 0 A2 2 0 1 0 -2 0', `${id}-b`, 0.72)}
      </>
    ),
  }

  return (
    <g
      key={`${type}-${cx}-${cy}`}
      transform={`translate(${cx},${cy}) scale(${scale}) rotate(${rotation})`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {flowerPaths[type](`${type}-${Math.round(cx)}-${Math.round(cy)}`)}
    </g>
  )
}

function BotanicalSvg({ id, stems, sideStyle }: { id: string; stems: Stem[]; sideStyle: React.CSSProperties }) {
  return (
    <svg
      id={id}
      style={sideStyle}
      viewBox="0 0 160 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {stems.map((stem, stemIndex) => {
        const stemEndX = stem.x + stem.lean
        const stemPath = [
          `M${stem.x.toFixed(1)} ${stem.yStart.toFixed(1)}`,
          `C${(stem.x - 18).toFixed(1)} ${(stem.yStart + 34).toFixed(1)}`,
          `${(stemEndX + 18).toFixed(1)} ${(stem.yEnd - 34).toFixed(1)}`,
          `${stemEndX.toFixed(1)} ${stem.yEnd.toFixed(1)}`,
          `M${(stem.x + stem.lean * 0.25).toFixed(1)} ${(stem.yStart + 32).toFixed(1)}`,
          `C${(stem.x - 20).toFixed(1)} ${(stem.yStart + 34).toFixed(1)}`,
          `${(stem.x - 25).toFixed(1)} ${(stem.yStart + 50).toFixed(1)}`,
          `${(stem.x - 10).toFixed(1)} ${(stem.yStart + 54).toFixed(1)}`,
          `M${(stem.x + stem.lean * 0.55).toFixed(1)} ${(stem.yStart + 66).toFixed(1)}`,
          `C${(stem.x + 21).toFixed(1)} ${(stem.yStart + 64).toFixed(1)}`,
          `${(stem.x + 26).toFixed(1)} ${(stem.yStart + 80).toFixed(1)}`,
          `${(stem.x + 10).toFixed(1)} ${(stem.yStart + 84).toFixed(1)}`,
        ].join(' ')

        return (
          <g key={`stem-${stemIndex}`}>
            {drawPath(stemPath, `stem-${stemIndex}`, 0.78)}
            {stem.flowers.map((flower, flowerIndex) => {
              const flowerY = Math.min(stem.yEnd, stem.yStart + flower.yOffset)
              const flowerX = stem.x + ((flowerY - stem.yStart) / Math.max(1, stem.yEnd - stem.yStart)) * stem.lean + flower.xOffset
              return drawFlower(flower.type, flowerX, flowerY, flower.scale, flower.rotation)
            })}
          </g>
        )
      })}
    </svg>
  )
}

export const BotanicalSketchLayer = React.memo(({
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
  leftId = 'botanical-left',
  rightId = 'botanical-right',
  zIndex = 1,
  animateOnScroll = true,
  scrollTrigger = null,
  activeSection,
  visible = true,
  style,
}: BotanicalSketchLayerProps) => {
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
  const stemCount = windowWidth < 768 ? 5 : STEM_COUNT
  const stems = useMemo(() => generateStems(resolvedSeed, stemCount), [resolvedSeed, stemCount])

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
    const pathsTopToBottom = [...paths].sort((a, b) => {
      const aBox = a.getBBox?.()
      const bBox = b.getBBox?.()
      return (aBox?.y ?? 0) - (bBox?.y ?? 0)
    })
    const animations: gsap.core.Tween[] = []
    const getPathLength = (path: SVGPathElement) => path.getTotalLength?.() ?? 100

    gsap.killTweensOf([content, ...paths])

    paths.forEach((path) => {
      gsap.set(path, {
        strokeDasharray: getPathLength(path),
      })
    })

    if (!visible) {
      if (!hasEnteredRef.current) {
        gsap.set(content, { opacity: 0, y: 18 })
        paths.forEach((path) => {
          gsap.set(path, {
            strokeDashoffset: getPathLength(path),
            opacity: 0,
          })
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
        gsap.set(path, {
          strokeDashoffset: getPathLength(path),
          opacity: 1,
        })

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
        gsap.set(path, {
          strokeDashoffset: getPathLength(path),
          opacity: 0,
        })
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
        inset: 0,
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
        <BotanicalSvg
          id={leftId}
          stems={stems}
          sideStyle={{
            ...baseSvgStyle,
            left: 0,
          }}
        />
        <BotanicalSvg
          id={rightId}
          stems={stems}
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

BotanicalSketchLayer.displayName = 'BotanicalSketchLayer'

export const BotanicalBorder = React.memo(() => {
  const sessionSeed = useMemo(() => Date.now(), [])
  const initialSection = useMemo(() => getInitialSectionId(), [])
  const activeSectionRef = useRef(initialSection)
  const pendingSectionRef = useRef(initialSection)
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

    const commitActiveSection = (sectionId: string, delay = 320) => {
      if (pendingSectionRef.current === sectionId && activeSectionRef.current === sectionId) return
      pendingSectionRef.current = sectionId

      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
      }

      pendingTimerRef.current = window.setTimeout(() => {
        setActiveSection((current) => (current === pendingSectionRef.current ? current : pendingSectionRef.current))
      }, delay)
    }

    const queueStableSection = (delay = 320) => {
      const stableSectionId = findStableSection()
      if (!stableSectionId) return
      commitActiveSection(stableSectionId, delay)
    }

    const observer = new IntersectionObserver(() => {
      queueStableSection()
    }, {
      root: null,
      rootMargin: '-22% 0px -22% 0px',
      // Reduce threshold from 51 points to 5 points to save CPU on scroll
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    })

    sections.forEach((section) => observer.observe(section))
    queueStableSection(0)

    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
      }
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
      {layers.map((layer, index) => {
        const isTopLayer = index === layers.length - 1 && !layer.leaving

        return (
          <BotanicalSketchLayer
            key={layer.key}
            seed={layer.seed}
            fixed
            leftId={isTopLayer ? 'botanical-left' : `botanical-left-${layer.key}`}
            rightId={isTopLayer ? 'botanical-right' : `botanical-right-${layer.key}`}
            activeSection={isTopLayer ? activeSection : undefined}
            animateOnScroll={false}
            visible={!layer.leaving}
          />
        )
      })}
    </>
  )
})

BotanicalBorder.displayName = 'BotanicalBorder'
