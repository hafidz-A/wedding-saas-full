'use client'

import React from 'react'
import useReveal from '../hooks/useReveal.js'
import { SectionHead } from '../components/SectionHead.jsx'
import styles from './Content.module.css'

const DEFAULTS = { eyebrow: 'Susunan Acara', title: 'Rangkaian Hari Ini', events: [] }

export default function Schedule(props) {
  const { eyebrow, title, subtitle, events } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal()
  return (
    <section className="sk-section sk-texture" aria-label="Susunan acara">
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <ul className={styles.rundown}>
          {(events || []).map((ev, i) => (
            <li key={ev.id ?? i} className={styles.rundownItem}>
              <span className={styles.rundownTime}>{ev.time}</span>
              <span className={styles.rundownBody}>
                <strong>{ev.title}</strong>
                {ev.description && <span>{ev.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
