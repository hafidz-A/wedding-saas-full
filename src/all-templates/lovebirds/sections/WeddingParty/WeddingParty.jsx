'use client'

import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './WeddingParty.module.css'

const DEFAULTS = {
  title: 'Wedding Party',
  subtitle: '',
  people: [],
}

const ACCENT_CYCLE = ['coral', 'gold', 'emerald', 'sky', 'purple']

export default function WeddingParty(props) {
  const { title, subtitle, people } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Wedding Party"
    >

      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Our circle of love</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <div className={styles.grid}>
          {people.map((p, idx) => {
            const accent = ACCENT_CYCLE[idx % ACCENT_CYCLE.length]
            return (
              <article
                key={p.id || idx}
                className={`${styles.card} ${styles[`accent-${accent}`]}`}
              >
                <div className={styles.avatar}>
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} loading="lazy" />
                  ) : (
                    <span className={styles.avatarFallback}>
                      {(p.name || '').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </span>
                  )}
                </div>
                <h3 className={styles.name}>{p.name}</h3>
                <p className={styles.role}>{p.role}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
