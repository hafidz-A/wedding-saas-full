'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './OurStory.module.css'
import { lovebirdsImg as demoImg } from '../../demoImages.js'

gsap.registerPlugin(ScrollTrigger)

/* Our Story — scroll-stacking card deck driven by GSAP ScrollTrigger. */

const DEFAULT_STORIES = [
  { id: 1, year: '2019', date: 'Januari 2019',  title: 'The First Meeting', description: 'Pertemuan pertama di sebuah kafe kecil — dua cangkir kopi dan tawa yang langsung terasa seperti rumah.', image: demoImg('storyFirstMeet', 1400) },
  { id: 2, year: '2020', date: 'Februari 2020', title: 'Our First Date',    description: 'Langkah pelan menyusuri galeri seni — bicara tentang apa saja, tak ingin sore itu berakhir.', image: demoImg('storyFirstDate', 1400) },
  { id: 3, year: '2022', date: 'Desember 2022', title: 'A Trip Together',   description: 'Sebuah perjalanan yang membuat kami yakin bisa melewati apapun bersama.', image: demoImg('storyHoliday', 1400) },
  { id: 4, year: '2024', date: 'Maret 2024',    title: 'The Proposal',      description: 'Pertanyaan tenang di hari Minggu yang biasa, dijawab dengan satu kata: ya.', image: demoImg('storyProposal', 1400) },
  { id: 5, year: '2025', date: 'November 2025', title: 'The Wedding Day',   description: 'Dan inilah kami — siap memulai bab berikutnya dari cerita kami.', image: demoImg('storyWedding', 1400) },
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
  const headerRef = useRef(null)
  const containerRef = useRef(null)
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

    const ROTATIONS = [-3.5, 2.2, -1.8, 3.5, -2.2, 1.8]

    // ── INITIAL STATE — set BEFORE any ScrollTrigger so cards are visible
    cardEls.forEach((card, i) => {
      if (i === 0) {
        gsap.set(card, {
          y: 0,
          x: 0,
          rotate: ROTATIONS[0],
          opacity: 1,
          scale: 1,
          zIndex: 10,
          willChange: 'transform, opacity',
        })
      } else {
        gsap.set(card, {
          y: '125%',
          x: 40,
          rotate: ROTATIONS[i % ROTATIONS.length] * 2.5,
          opacity: 0,
          scale: 1,
          zIndex: 10 + i,
          willChange: 'transform, opacity',
        })
      }
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
            x: 0,
            rotate: ROTATIONS[i % ROTATIONS.length],
            opacity: 1,
            duration: STEP_DURATION,
            ease: STEP_EASE,
          },
          stepStart,
        )
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

  /* Phones: the section is pinned at exactly one viewport with overflow
     hidden, so a long story description used to fall off the bottom. Size
     the polaroid stage to the space left after the header and the TALLEST
     description (all descriptions share one grid cell, so the panel is
     always that tall — no jump when cards swap). If even a minimum-size
     photo leaves too little room, the description scrolls inside itself. */
  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const panel = descPanelRef.current
    const container = containerRef.current
    if (!section || !stage || !panel || !container) return undefined
    const mq = window.matchMedia('(max-width: 767px)')
    const px = (v) => parseFloat(v) || 0

    const fit = () => {
      stage.style.width = ''
      stage.style.height = ''
      panel.style.maxHeight = ''
      panel.style.overflowY = ''
      panel.classList.remove(styles.descCompact)
      if (!mq.matches) return
      const sc = getComputedStyle(section)
      const inner = window.innerHeight - px(sc.paddingTop) - px(sc.paddingBottom)
      const header = headerRef.current
      const headerH = header ? header.offsetHeight + px(getComputedStyle(header).marginBottom) : 0
      const gap = px(getComputedStyle(container).rowGap)
      const maxW = Math.min(320, window.innerWidth * 0.82)
      const maxH = Math.min(window.innerHeight * 0.5, maxW / 0.8)
      const minH = Math.min(maxH, 140)
      const room = () => inner - headerH - gap - Math.ceil(panel.getBoundingClientRect().height)
      let h = room()
      if (h < minH) {
        // Step 1: slightly smaller story text.
        panel.classList.add(styles.descCompact)
        h = room()
      }
      if (h < minH) {
        // Step 2 (very long story on a tiny phone): scroll inside the panel.
        h = minH
        panel.style.maxHeight = `${Math.max(80, inner - headerH - gap - h)}px`
        panel.style.overflowY = 'auto'
      }
      h = Math.floor(Math.min(h, maxH))
      stage.style.height = `${h}px`
      stage.style.width = `${Math.floor(h * 0.8)}px`
    }

    const refit = () => {
      fit()
      ScrollTrigger.refresh()
    }
    fit()
    // The display font loads after first paint and changes text height.
    document.fonts?.ready?.then(refit).catch(() => {})
    let t = 0
    let lastW = window.innerWidth
    let lastH = window.innerHeight
    const onResize = () => {
      // Ignore the mobile URL bar showing/hiding mid-scroll (small height-only
      // change) — refreshing ScrollTrigger then would jolt the pinned deck.
      const w = window.innerWidth
      const hh = window.innerHeight
      if (w === lastW && Math.abs(hh - lastH) < 120) return
      lastW = w
      lastH = hh
      clearTimeout(t)
      t = setTimeout(refit, 150)
    }
    window.addEventListener('resize', onResize)
    mq.addEventListener?.('change', refit)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
      mq.removeEventListener?.('change', refit)
    }
  }, [data])

  return (
    <section ref={sectionRef} className={styles.section} aria-label={ariaLabel}>
      {(title || subtitle || eyebrow) && (
        <header ref={headerRef} className={styles.sectionHeader}>
          {eyebrow && <p className={styles.sectionEyebrow}>{eyebrow}</p>}
          {title && <h2 className={styles.sectionTitle}>{title}</h2>}
          {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
        </header>
      )}

      <div ref={containerRef} className={styles.container}>
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

        {/* Every description is rendered into the same grid cell (only the
            active one visible), so the panel's height is the tallest story's
            and stays put while cards swap. */}
        <div ref={descPanelRef} className={styles.descPanel}>
          {data.map((s, i) => (
            <div
              key={s.id ?? i}
              className={`${styles.descItem} ${i === activeIndex ? styles.descItemActive : ''}`}
              aria-hidden={i === activeIndex ? undefined : 'true'}
            >
              {s.year && (
                <span className={`${styles.descYear} ${s.date.includes(s.year) ? styles.descYearDup : ''}`}>
                  {s.year}
                </span>
              )}
              {s.date && <span className={styles.descDate}>{s.date}</span>}
              {s.title && <h2 className={styles.descTitle}>{s.title}</h2>}
              {s.description && <p className={styles.descText}>{s.description}</p>}
            </div>
          ))}
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
