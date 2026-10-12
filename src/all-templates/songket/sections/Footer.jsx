'use client'

import React from 'react'
import { AmperaNight, Perahu, BintangBerantai } from '../components/ornaments.jsx'
import styles from './Interactive.module.css'

const DEFAULTS = {
  coupleName: '',
  message: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir memberikan doa restu.',
  closing: "Wassalamu'alaikum Warahmatullahi Wabarakatuh",
  hashtag: '',
  motto: 'Wong Kito Galo',
}

/** Penutup: Ampera over the Musi at night, a perahu drifting past. */
export default function Footer(props) {
  const { coupleName, message, closing, hashtag, motto } = { ...DEFAULTS, ...props }
  return (
    <footer className={`sk-section ${styles.footer}`} aria-label="Penutup">
      <span className="sk-rebung" aria-hidden="true" />
      <div className={`sk-inner ${styles.footerInner}`}>
        {message && <p className={styles.footerMessage}>{message}</p>}
        {closing && <p className={styles.footerClosing}>{closing}</p>}
        <p className={styles.footerFrom}>Kami yang berbahagia,</p>
        {coupleName && <p className={styles.footerNames}>{coupleName}</p>}
        <BintangBerantai className="sk-divider" />
        {hashtag && <p className={styles.hashtag}>{hashtag}</p>}
      </div>
      <div className={styles.scene} aria-hidden="true">
        <AmperaNight className={styles.ampera} />
        <Perahu className={styles.perahu} />
      </div>
      {motto && <p className={styles.motto}>{motto}</p>}
    </footer>
  )
}
