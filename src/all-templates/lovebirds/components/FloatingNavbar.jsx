'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { sectionRegistry } from '../registry.js'
import styles from './FloatingNavbar.module.css'

/**
 * Floating in-page navigation.
 *
 * Responsive behavior:
 *   • Desktop / tablet (≥768px): horizontal pill list with ‹ › scroll buttons.
 *   • Mobile (<768px): a single hamburger trigger in the corner that opens a
 *     full-width drop-down sheet listing every section vertically. Both
 *     surfaces share the same `items` array and click handler — the only
 *     thing that differs is the markup the CSS reveals at each breakpoint.
 *
 * Visibility on scroll:
 *   • Appears after the user scrolls past `threshold` px.
 *   • Click handler does smooth-scroll to the target section via
 *     `scrollIntoView({ behavior: 'smooth' })` for cross-browser support.
 *   • Active item is highlighted via IntersectionObserver — whichever
 *     section is most-visible in the viewport gets the active style.
 *
 * To hide a section from the nav, set `navHidden: true` on its config
 * entry in pageConfig.js. Override the label with `navLabel: '…'`.
 */
function stackLabel(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return words[0] || ''
  if (words.length === 2) return words.join('\n')
  const mid = Math.ceil(words.length / 2)
  return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ')
}

// Single-line label for the mobile sheet (which has plenty of horizontal room).
function flatLabel(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

const DEFAULT_LABELS = {
  hero: 'Top',
  countdown: 'Countdown',
  ourStory: 'Story',
  eventDetails: 'Events',
  brideGroom: 'Couple',
  weddingParty: 'Party',
  gallery: 'Gallery',
  schedule: 'Schedule',
  rsvp: 'RSVP',
  weddingGift: 'Gift',
  registry: 'Registry',
  accommodations: 'Stay',
  faq: 'FAQ',
  guestbook: 'Notes',
  footer: 'End',
}

export default function FloatingNavbar({ sections = [], threshold = 600 }) {
  const [visible, setVisible] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const listRef = useRef(null)

  // Show/hide based on scroll position
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  // Build the list of visible nav items. Memoized — a fresh array identity on
  // every render made the IntersectionObserver effect below tear down and
  // recreate the observer on every activeId change while scrolling.
  const items = useMemo(
    () =>
      sections
        .filter((s) => s.enabled !== false && !s.navHidden)
        .filter((s) => Boolean(sectionRegistry[s.type]))
        .map((s) => {
          const raw = s.navLabel || DEFAULT_LABELS[s.type] || s.id
          return { id: s.id, label: stackLabel(raw), flatLabel: flatLabel(raw) }
        }),
    [sections],
  )

  // Track which section the user is currently viewing
  useEffect(() => {
    if (items.length === 0) return undefined
    const setup = () => {
      const targets = items
        .map((it) => document.getElementById(it.id))
        .filter(Boolean)
      if (targets.length === 0) return null
      const observer = new IntersectionObserver(
        (entries) => {
          const sorted = [...entries]
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          if (sorted[0]) setActiveId(sorted[0].target.id)
        },
        {
          rootMargin: '-30% 0px -30% 0px',
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      )
      targets.forEach((el) => observer.observe(el))
      return observer
    }
    let observer = setup()
    const t = setTimeout(() => { if (!observer) observer = setup() }, 300)
    return () => { clearTimeout(t); observer?.disconnect() }
  }, [items])

  const handleClick = (e, id) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      // The page pins the hero + Our Story with GSAP; their pin-spacer heights
      // aren't final until ScrollTrigger recalculates. Without this, the first
      // scrollIntoView aimed at a STALE position (a big overshoot, then snap),
      // so the section looked like it didn't scroll and needed a SECOND click.
      // Refreshing first makes every position final → one click lands it.
      try { ScrollTrigger.refresh() } catch { /* GSAP not active — ignore */ }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
    setMobileOpen(false)
  }

  const checkScroll = () => {
    const el = listRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const scrollNav = (dir) => {
    const el = listRef.current
    if (!el) return
    el.scrollBy({ left: dir * 140, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return undefined
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [visible, items.length])

  // Lock body scroll while the mobile sheet is open, and close on Escape.
  useEffect(() => {
    if (!mobileOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  if (items.length === 0) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.shell}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden={!visible}
        >
          {/* ===== Desktop / tablet: horizontal pill list (≥768px) ===== */}
          <nav className={styles.nav} aria-label="Section navigation">
            {canScrollLeft && (
              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => scrollNav(-1)}
                aria-label="Scroll nav left"
              >‹</button>
            )}
            <ul ref={listRef} className={styles.list}>
              {items.map((it) => (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    onClick={(e) => handleClick(e, it.id)}
                    className={`${styles.link} ${activeId === it.id ? styles.linkActive : ''}`}
                    aria-current={activeId === it.id ? 'true' : undefined}
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
            {canScrollRight && (
              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => scrollNav(1)}
                aria-label="Scroll nav right"
              >›</button>
            )}
          </nav>

          {/* ===== Mobile (<768px): hamburger trigger + sheet ===== */}
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="floating-nav-sheet"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          >
            <span className={`${styles.bar} ${mobileOpen ? styles.barTop : ''}`} />
            <span className={`${styles.bar} ${mobileOpen ? styles.barMid : ''}`} />
            <span className={`${styles.bar} ${mobileOpen ? styles.barBot : ''}`} />
          </button>

          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  className={styles.sheetBackdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileOpen(false)}
                  aria-hidden="true"
                />
                <motion.nav
                  id="floating-nav-sheet"
                  className={styles.sheet}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  aria-label="Section navigation"
                >
                  <ul className={styles.sheetList}>
                    {items.map((it) => (
                      <li key={it.id}>
                        <a
                          href={`#${it.id}`}
                          onClick={(e) => handleClick(e, it.id)}
                          className={`${styles.sheetLink} ${activeId === it.id ? styles.sheetLinkActive : ''}`}
                          aria-current={activeId === it.id ? 'true' : undefined}
                        >
                          {it.flatLabel}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.nav>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
