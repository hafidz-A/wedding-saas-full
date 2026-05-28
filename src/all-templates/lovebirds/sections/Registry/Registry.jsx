'use client'

import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Registry.module.css'

const DEFAULTS = { title: 'Wedding Registry', message: '', platforms: [] }

export default function Registry(props) {
  const { title, message, platforms } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Wedding Registry"
    >

      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>A small wish list</p>
          <h2 className={styles.title}>{title}</h2>
          {message && <p className={styles.message}>{message}</p>}
        </header>

        <div className={styles.grid}>
          {platforms.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.card} ${styles[`accent-${p.accent || 'purple'}`]}`}
            >
              <span className={styles.cardLabel}>Registry</span>
              <h3 className={styles.cardTitle}>{p.name}</h3>
              <p className={styles.cardDesc}>{p.description}</p>
              <span className={styles.cardCta}>
                Visit
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
