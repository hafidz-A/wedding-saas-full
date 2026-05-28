'use client'

import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Footer.module.css'

const DEFAULTS = {
  monogram: 'R & A',
  hashtag: '#OurWedding',
  message: 'Thank you for being part of our story.',
  coupleName: 'The Happy Couple',
  socials: [],
}

function MonogramSvg({ text }) {
  return (
    <svg viewBox="0 0 200 200" className={styles.monogram} aria-hidden="true">
      <defs>
        <linearGradient id="monoStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDF6EC" />
          <stop offset="100%" stopColor="#F5C842" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="86" fill="none" stroke="url(#monoStroke)" strokeWidth="1.2" opacity="0.9" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="url(#monoStroke)" strokeWidth="0.6" opacity="0.55" />
      <text
        x="50%" y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize="52"
        fill="url(#monoStroke)"
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
  const { monogram, hashtag, message, coupleName, socials } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()

  return (
    <footer
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Footer"
    >
      <div className={styles.inner}>
        <MonogramSvg text={monogram} />

        <h2 className={styles.hashtag}>{hashtag}</h2>
        <p className={styles.message}>{message}</p>

        {socials?.length > 0 && (
          <ul className={styles.socials}>
            {socials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
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
