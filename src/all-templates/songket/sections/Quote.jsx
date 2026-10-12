'use client'

import React from 'react'
import useReveal from '../hooks/useReveal.js'
import { TepakSirih, BintangBerantai } from '../components/ornaments.jsx'
import styles from './Content.module.css'

const DEFAULTS = {
  greeting: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
  intro: '',
  text: '',
  attribution: '',
}

/** "Kato Pembuko" — the opening salam, offered over a tepak sirih. */
export default function Quote(props) {
  const { greeting, intro, text, attribution } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal()
  return (
    <section className="sk-section sk-texture" aria-label="Salam pembuka">
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''} ${styles.quote}`}>
        <TepakSirih className={styles.quoteIcon} />
        {greeting && <p className={styles.greeting}>{greeting}</p>}
        {intro && <p className={styles.intro}>{intro}</p>}
        {text && (
          <blockquote className={styles.verse}>
            <p>“{text}”</p>
            {attribution && <cite>{attribution}</cite>}
          </blockquote>
        )}
        <BintangBerantai className="sk-divider" />
      </div>
    </section>
  )
}
