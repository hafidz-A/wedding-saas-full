'use client'

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './SpiralGallery.module.css'

gsap.registerPlugin(ScrollTrigger)

type SpiralPhoto = {
  id: number | string
  src: string
  alt: string
}

type SpiralGalleryProps = {
  photos?: SpiralPhoto[]
  ariaLabel?: string
  eyebrow?: string
  title?: string
  subtitle?: string
}

const DEFAULT_PHOTOS: SpiralPhoto[] = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  src: `/gallery/foto-${index + 1}.jpg`,
  alt: `Caption foto ${index + 1}`,
}))

function SpiralGallery({
  photos = DEFAULT_PHOTOS,
  ariaLabel = 'Spiral wedding photo gallery',
  eyebrow = 'A glimpse of us',
  title = 'Moments',
  subtitle = '',
}: SpiralGalleryProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const tunnelRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const syncBreakpoint = () => setIsMobile(mediaQuery.matches)

    syncBreakpoint()
    mediaQuery.addEventListener('change', syncBreakpoint)

    return () => mediaQuery.removeEventListener('change', syncBreakpoint)
  }, [])

  const galleryPhotos = useMemo(() => photos, [photos])
  const hasTunnel = galleryPhotos.length >= 3
  const photoWidth = isMobile ? 96 : 150
  const photoHeight = isMobile ? 124 : 192

  const config = useMemo(() => {
    const n = photos.length

    return {
      GOLDEN_ANGLE: 137.508,
      RADIUS: Math.min(200, 100 + n * 3),
      DEPTH_STEP: Math.max(55, Math.min(120, 800 / n)),
      SCALE_DECAY: Math.max(0.018, Math.min(0.06, 1.2 / n)),
      OPACITY_DECAY: Math.max(0.015, Math.min(0.055, 1.1 / n)),
      OPACITY_FLOOR: Math.max(0.08, Math.min(0.25, 2 / n)),
      SCALE_FLOOR: Math.max(0.18, Math.min(0.35, 3 / n)),
    }
  }, [photos.length])

  const radius = isMobile ? Math.min(90, config.RADIUS * 0.6) : config.RADIUS
  const depthStep = isMobile ? Math.max(45, config.DEPTH_STEP * 0.65) : config.DEPTH_STEP

  const items = useMemo(
    () =>
      galleryPhotos.map((photo, index) => {
        const angle = index * config.GOLDEN_ANGLE
        const depth = index * depthStep
        const scale = Math.max(config.SCALE_FLOOR, 1 - index * config.SCALE_DECAY)
        const opacity = Math.max(config.OPACITY_FLOOR, 1 - index * config.OPACITY_DECAY)

        return {
          ...photo,
          loading: index <= 8 ? 'eager' : 'lazy',
          style: {
            '--photo-width': `${photoWidth}px`,
            '--photo-height': `${photoHeight}px`,
            opacity: hasTunnel ? opacity : 1,
            transform: hasTunnel
              ? `rotateY(${angle}deg) translateX(${radius}px) translateZ(-${depth}px) scale(${scale})`
              : undefined,
          } as CSSProperties,
        }
      }),
    [config, depthStep, galleryPhotos, hasTunnel, photoHeight, photoWidth, radius],
  )

  useEffect(() => {
    const section = sectionRef.current
    const tunnel = tunnelRef.current
    if (!hasTunnel || !section || !tunnel) return undefined

    const ctx = gsap.context(() => {
      gsap.set(tunnel, {
        rotateY: 0,
        z: 0,
        transformStyle: 'preserve-3d',
      })

      gsap.to(tunnel, {
        rotateY: 360 * 2,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: 2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      gsap.to(tunnel, {
        z: 400,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=300%',
          scrub: 2,
          invalidateOnRefresh: true,
        },
      })
    }, section)

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300)

    return () => {
      window.clearTimeout(refreshId)
      ctx.revert()
    }
  }, [hasTunnel, isMobile, photos.length])

  return (
    <section ref={sectionRef} className={styles.section} aria-label={ariaLabel}>
      <div className={styles.viewport}>
        <header className={styles.header}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <div className={hasTunnel ? styles.tunnelFrame : styles.gridFrame}>
          <div className={styles.tunnelGlow} aria-hidden="true" />
          {hasTunnel && <div className={styles.ambientRing} aria-hidden="true" />}
          <div
            ref={tunnelRef}
            className={hasTunnel ? `${styles.tunnelWrapper} tunnel-wrapper` : styles.gridFallback}
          >
            {items.map((photo) => (
              <figure
                key={photo.id}
                className={`${styles.photoItem} photo-item`}
                style={photo.style}
              >
                <img
                  className={styles.photoImage}
                  src={photo.src}
                  alt={photo.alt}
                  loading={photo.loading as 'eager' | 'lazy'}
                  decoding="async"
                />
                <figcaption className={styles.photoCaption}>{photo.alt}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(SpiralGallery)
