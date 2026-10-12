'use client'

import React from 'react'
import useReveal from '../hooks/useReveal.js'
import { SectionHead, Corners } from '../components/SectionHead.jsx'
import { TepakSirih, PayungPengantin, BintangBerantai } from '../components/ornaments.jsx'
import styles from './Content.module.css'

const DEFAULTS = {
  eyebrow: 'Waktu & Tempat',
  title: 'Akad & Resepsi',
  events: [],
  mapEmbed: '',
  mapUrl: '',
}

// Lovebirds icon keys map onto the two adat objects.
const ICONS = { rings: TepakSirih, akad: TepakSirih, champagne: PayungPengantin, resepsi: PayungPengantin }

export default function EventDetails(props) {
  const { eyebrow, title, subtitle, events, mapEmbed, mapUrl } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal()
  return (
    <section className="sk-section sk-section--alt sk-texture" aria-label="Detail acara">
      <span className="sk-rebung" aria-hidden="true" />
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className={styles.events}>
          {(events || []).map((ev, i) => {
            const Icon = ICONS[ev.icon] ?? (i === 0 ? TepakSirih : PayungPengantin)
            return (
              <article key={ev.id ?? i} className={`sk-card ${styles.event}`}>
                <Corners />
                <Icon className={styles.eventIcon} />
                <h3 className={styles.eventTitle}>{ev.label}</h3>
                <BintangBerantai className={styles.eventDivider} />
                {ev.date && <p className={styles.eventDate}>{ev.date}</p>}
                {ev.time && <p className={styles.eventTime}>{ev.time}</p>}
                {ev.location && <p className={styles.eventPlace}>{ev.location}</p>}
              </article>
            )
          })}
        </div>
        {mapEmbed && (
          <div className={styles.map}>
            <iframe src={mapEmbed} title="Peta lokasi acara" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
        {mapUrl && (
          <p className={styles.mapLink}>
            <a className="sk-btn" href={mapUrl} target="_blank" rel="noreferrer">Buka Google Maps</a>
          </p>
        )}
      </div>
    </section>
  )
}
