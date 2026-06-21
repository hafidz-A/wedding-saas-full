'use client'

import useScrollReveal from '../../hooks/useScrollReveal.js'
import SceneFrame from '../../components/SceneFrame.jsx'
import styles from './Footer.module.css'
import { deriveMonogram } from '../../config/monogram.js'
import { safeExternalUrl } from '@/lib/safeUrl'

const DEFAULTS = {
  monogram: 'A & R',
  hashtag: '#OurWedding',
  message: 'Thank you for being part of our story.',
  coupleName: 'The Happy Couple',
  socials: [],
  photos: [],
}

function MonogramSvg({ text }) {
  // currentColor inherits the footer's palette contrast colour (--ftr-fg, same
  // as the hashtag), so the monogram stays legible on EVERY palette instead of a
  // fixed cream→gold that vanishes on light/gold backgrounds.
  return (
    <svg viewBox="0 0 200 200" className={styles.monogram} aria-hidden="true">
      <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      <text
        x="50%" y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize="52"
        fill="currentColor"
      >
        {text}
      </text>
    </svg>
  )
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
  const { monogram, hashtag, message, coupleName, socials, photos } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()
  const monogramText = deriveMonogram(coupleName, undefined, monogram)
  const couplePhotos = (Array.isArray(photos) ? photos : []).filter((p) => p && p.src).slice(0, 2)

  return (
    <footer
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Footer"
    >
      <SceneFrame />
      <div className={styles.inner}>
        <MonogramSvg text={monogramText} />

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

        <h2 className={styles.hashtag}>{hashtag}</h2>
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
          © {new Date().getFullYear()} {coupleName}. Made with care.
        </p>
      </div>
    </footer>
  )
}
