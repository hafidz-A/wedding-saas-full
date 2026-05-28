'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './OurStory.module.css'

gsap.registerPlugin(ScrollTrigger)

/* ============================================================================
   OUR STORY — scroll-stacking deck (GSAP ScrollTrigger, scrub timeline)
   ============================================================================ */

const DEFAULT_STORIES = [
  { id: 1, year: '2019', date: 'Januari 2019',  title: 'The First Meeting', description: 'Sebuah pertemuan pertama yang tidak terduga di tepi pantai.', image: '' },
  { id: 2, year: '2020', date: 'Februari 2020', title: 'Our First Date',    description: 'Kafe kecil di sudut kota, dua cangkir kopi, percakapan tanpa habis.', image: '' },
  { id: 3, year: '2022', date: 'Desember 2022', title: 'A Trip Together',   description: 'Sebuah perjalanan yang membuat kami yakin bisa melewati apapun bersama.', image: '' },
  { id: 4, year: '2024', date: 'Maret 2024',    title: 'The Proposal',      description: 'Pertanyaan tenang di hari Minggu yang biasa, dijawab dengan satu kata: ya.', image: '' },
  { id: 5, year: '2025', date: 'November 2025', title: 'The Wedding Day',   description: 'Dan inilah kami — siap memulai bab berikutnya dari cerita kami.', image: '' },
]

const ACCENT_GRADIENTS = [
  'linear-gradient(135deg, #E8553E 0%, #F5C842 100%)',
  'linear-gradient(135deg, #2D8C4E 0%, #7CC494 100%)',
  'linear-gradient(135deg, #6B35A8 0%, #C9A5E8 100%)',
  'linear-gradient(135deg, #3D9BC1 0%, #A8D5E3 100%)',
  'linear-gradient(135deg, #C13E29 0%, #E8553E 100%)',
]

// Uniform timing — every card transition uses the same values
const STEP_DURATION = 1
const STEP_EASE     = 'power3.out'
const SCRUB_LAG     = 1

const DEPTH_SCALE_STEP = 0.04
const DEPTH_Y_STEP     = 16
const MIN_SCALE        = 0.62

export default function OurStory({
  stories,
  cards,
  title = 'Our Story',
  subtitle = '',
  eyebrow = 'Our journey',
  scrollPerCardPx = 400,
  ariaLabel = 'Our Story',
}) {
  /* CRITICAL: memoize data so useEffect doesn't re-run every render.
     Without this, every parent re-render rebuilds the entire ScrollTrigger
     pin + timeline, which can fight other pinned sections and (in the
     worst case) leave the page with content hidden because pin spacers
     get computed during a torn-down state. */
  const data = useMemo(
    () => normalizeStories(stories || cards || DEFAULT_STORIES),
    [stories, cards],
  )

  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const descPanelRef = useRef(null)
  const activeIndexRef = useRef(0)

  const [activeIndex, setActiveIndex] = useState(0)

  const setCardRef = (idx) => (el) => {
    if (el) cardRefs.current[idx] = el
  }

  useEffect(() => {
    const sectionEl = sectionRef.current
    const cardEls = cardRefs.current.filter(Boolean)
    const total = cardEls.length

    // Defensive: bail safely if anything's missing — but still render content
    if (!sectionEl || total === 0) return undefined

    // ── INITIAL STATE — set BEFORE any ScrollTrigger so cards are visible
    cardEls.forEach((card, i) => {
      gsap.set(card, {
        y: i === 0 ? 0 : 80,
        opacity: i === 0 ? 1 : 0,
        scale: 1,
        zIndex: total - i,
        willChange: 'transform',
      })
    })
    activeIndexRef.current = 0

    const swapDescription = (newIdx) => {
      const panel = descPanelRef.current
      if (!panel) {
        setActiveIndex(newIdx)
        return
      }
      gsap.to(panel, {
        opacity: 0,
        y: -10,
        duration: 0.25,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          setActiveIndex(newIdx)
          gsap.to(panel, {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
          })
        },
      })
    }

    // Pass the actual DOM element to gsap.context (not the ref object)
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: `+=${(total - 1) * scrollPerCardPx}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          scrub: SCRUB_LAG,
          onUpdate: (self) => {
            const idx = Math.min(
              total - 1,
              Math.round(self.progress * (total - 1)),
            )
            if (idx !== activeIndexRef.current) {
              activeIndexRef.current = idx
              swapDescription(idx)
            }
          },
        },
      })

      for (let i = 1; i < total; i++) {
        const stepStart = i - 1

        tl.to(
          cardEls[i],
          {
            y: 0,
            opacity: 1,
            scale: 1,
            zIndex: total + i,
            duration: STEP_DURATION,
            ease: STEP_EASE,
          },
          stepStart,
        )

        for (let j = 0; j < i; j++) {
          const depthAfter = i - j
          const scale = Math.max(MIN_SCALE, 1 - depthAfter * DEPTH_SCALE_STEP)
          const yOffset = depthAfter * DEPTH_Y_STEP
          tl.to(
            cardEls[j],
            {
              y: yOffset,
              scale,
              opacity: 1,
              zIndex: total + i - depthAfter,
              duration: STEP_DURATION,
              ease: STEP_EASE,
            },
            stepStart,
          )
        }
      }
    }, sectionEl)

    // Refresh ScrollTrigger once after images may have loaded — fixes
    // pin-spacer height when lazy-loaded images change layout
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300)

    return () => {
      window.clearTimeout(refreshId)
      ctx.revert()
    }
  }, [data, scrollPerCardPx])

  const current = data[activeIndex] || data[0]

  return (
    <section ref={sectionRef} className={styles.section} aria-label={ariaLabel}>
      {(title || subtitle || eyebrow) && (
        <header className={styles.sectionHeader}>
          {eyebrow && <p className={styles.sectionEyebrow}>{eyebrow}</p>}
          {title && <h2 className={styles.sectionTitle}>{title}</h2>}
          {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
        </header>
      )}

      <div className={styles.container}>
        <div ref={stageRef} className={styles.stage}>
          {data.map((s, i) => (
            <div
              key={s.id ?? i}
              ref={setCardRef(i)}
              className={styles.card}
              style={{
                background: ACCENT_GRADIENTS[i % ACCENT_GRADIENTS.length],
              }}
              aria-hidden="true"
            >
              {s.image && (
                <img
                  src={s.image}
                  alt=""
                  className={styles.cardImage}
                  loading="lazy"
                />
              )}
              <span className={styles.cardOverlay} />
              <span className={styles.cardNumber}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={styles.cardPattern} />
              <span className={styles.cardCorner} />
            </div>
          ))}
        </div>

        <div ref={descPanelRef} className={styles.descPanel}>
          {current?.year && <span className={styles.descYear}>{current.year}</span>}
          {current?.date && <span className={styles.descDate}>{current.date}</span>}
          {current?.title && <h2 className={styles.descTitle}>{current.title}</h2>}
          {current?.description && (
            <p className={styles.descText}>{current.description}</p>
          )}
        </div>
      </div>
    </section>
  )
}

function normalizeStories(arr) {
  return arr.map((s, i) => ({
    id: s.id ?? i,
    year: s.year || (s.date ? extractYear(s.date) : ''),
    date: s.date || '',
    title: s.title || '',
    description: s.description || '',
    image: s.image || '',
  }))
}

function extractYear(dateStr) {
  const match = String(dateStr).match(/\b(19|20)\d{2}\b/)
  return match ? match[0] : ''
}
