'use client'

import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Accommodations.module.css'

const DEFAULTS = { title: 'Where to Stay', subtitle: '', hotels: [], tips: [] }

function TipIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'plane': return <svg {...common}><path d="M3 14l8-2 7-9 2 1-4 11 2 6-2 1-4-5-7 2-1-2 5-3z" /></svg>
    case 'car':   return <svg {...common}><path d="M5 13l1.5-4a2 2 0 012-1.4h7a2 2 0 012 1.4L19 13" /><rect x="3" y="13" width="18" height="6" rx="2" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" /></svg>
    case 'sun':
    default:      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
  }
}

export default function Accommodations(props) {
  const { title, subtitle, hotels, tips } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Accommodations"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>For our travelers</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <div className={styles.layout}>
          <div className={styles.hotels}>
            {hotels.map((h) => (
              <article key={h.id} className={styles.hotelCard}>
                <header className={styles.hotelHead}>
                  <h3 className={styles.hotelName}>{h.name}</h3>
                  <span className={styles.distanceBadge}>{h.distance}</span>
                </header>
                {h.tag && <span className={styles.tag}>{h.tag}</span>}
                <p className={styles.hotelDesc}>{h.description}</p>
                <dl className={styles.meta}>
                  <div className={styles.metaRow}>
                    <dt>Price</dt>
                    <dd>{h.price}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${(h.phone || '').replace(/\s+/g, '')}`}>{h.phone}</a>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <aside className={styles.tipsCard}>
            <h3 className={styles.tipsTitle}>Travel Tips</h3>
            <ul className={styles.tipsList}>
              {tips.map((t) => (
                <li key={t.id} className={styles.tip}>
                  <span className={styles.tipIcon}><TipIcon name={t.icon} /></span>
                  <span>{t.text}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}
