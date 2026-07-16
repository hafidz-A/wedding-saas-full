'use client'

import { useEffect, useRef } from 'react'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import SceneFrame from '../../components/SceneFrame.jsx'
import styles from './Footer.module.css'
import { safeExternalUrl } from '@/lib/safeUrl'
import { BRAND } from '@/lib/brand'

const DEFAULTS = {
  monogram: 'A & R',
  hashtag: '#OurWedding',
  message: 'Thank you for being part of our story.',
  coupleName: 'The Happy Couple',
  socials: [],
  photos: [],
}

function SocialIcon({ label }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const key = (label || '').toLowerCase()
  if (key.includes('insta')) {
    return (
      <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
    )
  }
  if (key.includes('mail') || key.includes('email')) {
    return (
      <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" /></svg>
    )
  }
  if (key.includes('spot')) {
    return (
      <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M7 14c3-1 7-1 10 0M7.5 11c4-1 8-1 11 0.5M8 8c4-1 8 0 11 1.5" /></svg>
    )
  }
  return (
    <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></svg>
  )
}

export default function Footer(props) {
  const { hashtag, message, coupleName, socials, photos } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()
  const couplePhotos = (Array.isArray(photos) ? photos : []).filter((p) => p && p.src).slice(0, 2)

  // Keep the hashtag on a single line at any length / device: the CSS sets the
  // ideal (clamped) size with white-space: nowrap; here we shrink the font only
  // when that single line would overflow its container, so long hashtags scale
  // down instead of wrapping to two lines.
  const hashtagRef = useRef(null)
  useEffect(() => {
    const el = hashtagRef.current
    const parent = el?.parentElement
    if (!el || !parent) return undefined
    const fit = () => {
      el.style.fontSize = '' // reset to the CSS clamp() base before measuring
      const cs = getComputedStyle(parent)
      const avail =
        parent.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0')
      const natural = el.scrollWidth
      if (avail > 0 && natural > avail) {
        const base = parseFloat(getComputedStyle(el).fontSize)
        el.style.fontSize = `${Math.max((base * avail) / natural * 0.99, 12)}px`
      }
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(parent)
    // The display font loads after first paint and changes the metrics, so refit.
    document.fonts?.ready?.then(fit).catch(() => {})
    return () => ro?.disconnect()
  }, [hashtag])

  return (
    <footer
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Footer"
    >
      <SceneFrame />
      <div className={styles.inner}>
        {couplePhotos.length > 0 && (
          <div className={styles.couplePhotos} aria-label="The couple">
            {couplePhotos.map((p, i) => (
              <div
                key={i}
                className={`${styles.photoCard} ${i === 0 ? styles.photoLeft : styles.photoRight}`}
              >
                <img
                  /* keyed by src so swapping the photo in the editor remounts
                     the element; note onError hides the PARENT card, which a
                     remount alone wouldn't undo — reset it on load instead */
                  key={p.src}
                  src={p.src}
                  alt={p.alt || ''}
                  loading="lazy"
                  onLoad={(e) => { e.currentTarget.parentElement.style.display = '' }}
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                />
              </div>
            ))}
          </div>
        )}

        <h2 ref={hashtagRef} className={styles.hashtag}>{hashtag}</h2>
        <p className={styles.message}>{message}</p>

        {socials?.length > 0 && (
          <ul className={styles.socials}>
            {socials.map((s) => (
              <li key={s.id}>
                <a
                  href={safeExternalUrl(s.url)}
                  className={styles.socialLink}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon label={s.label} />
                  <span>{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.signoff}>
          With love, <span className={styles.coupleName}>{coupleName}</span>
        </p>

        <p className={styles.fineprint}>
          © {new Date().getFullYear()} {BRAND}. Made with care.
        </p>
      </div>
    </footer>
  )
}
