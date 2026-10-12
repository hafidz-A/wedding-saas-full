'use client'

import React, { useEffect, useState } from 'react'
import { LawangDoor, RumahLimas, CoupleAesanGede, TepakSirih } from '../components/ornaments.jsx'
import { readGuestName, readPreviewMode } from '../utils/guestName.js'
import { formatLongDate, parseWeddingDate } from '../utils/date.js'
import styles from './Hero.module.css'

const DEFAULTS = {
  brideName: 'Ayu',
  groomName: 'Rizky',
  weddingDate: '',
  venue: '',
  eyebrow: 'Undangan Pernikahan',
  welcomeText: 'Kepada Yth. Bapak/Ibu/Saudara/i',
  openLabel: 'Buka Undangan',
  countdownEnabled: true,
}

const OPEN_MS = 1600

/**
 * Pembuka "Lawang": the guest opens the carved Rumah Limas doors, then lands on
 * the couple + date + countdown with the house standing behind them.
 * The editor preview (?preview=1) skips the gate so every reload isn't a click.
 */
export default function Hero(props) {
  const cfg = { ...DEFAULTS, ...props }
  const [guestName, setGuestName] = useState(null)
  const [gate, setGate] = useState('closed') // closed → opening → gone

  useEffect(() => {
    setGuestName(readGuestName())
    if (readPreviewMode()) setGate('gone')
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (gate === 'gone') {
      root.classList.remove('sk-locked')
      return undefined
    }
    root.classList.add('sk-locked')
    return () => root.classList.remove('sk-locked')
  }, [gate])

  const open = () => {
    if (gate !== 'closed') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setGate('opening')
    window.setTimeout(() => setGate('gone'), reduce ? 0 : OPEN_MS)
  }

  return (
    <>
      {gate !== 'gone' && (
        <div className={`${styles.gate} ${gate === 'opening' ? styles.opening : ''}`}>
          <div className={`${styles.door} ${styles.doorLeft}`} aria-hidden="true"><LawangDoor /></div>
          <div className={`${styles.door} ${styles.doorRight}`} aria-hidden="true"><LawangDoor /></div>
          <div className={styles.plaque} role="dialog" aria-label="Pembuka undangan">
            <TepakSirih className={styles.plaqueIcon} />
            <p className={styles.plaqueEyebrow}>{cfg.eyebrow}</p>
            <p className={styles.plaqueNames}>
              {cfg.brideName} &amp; {cfg.groomName}
            </p>
            <p className={styles.plaqueTo}>{cfg.welcomeText}</p>
            <p className={styles.plaqueGuest}>{guestName || 'Tamu Undangan'}</p>
            <button type="button" className="sk-btn" onClick={open}>
              {cfg.openLabel}
            </button>
          </div>
        </div>
      )}

      <section className={`${styles.hero} sk-texture sk-texture--lepus`} aria-label="Pembuka">
        <CoupleAesanGede className={styles.couple} />
        <p className={styles.eyebrow}>{cfg.eyebrow}</p>
        <h1 className={styles.names}>
          {cfg.brideName}
          <span className={styles.amp}>&amp;</span>
          {cfg.groomName}
        </h1>
        {cfg.weddingDate && <p className={styles.date}>{formatLongDate(cfg.weddingDate)}</p>}
        {cfg.venue && <p className={styles.venue}>{cfg.venue}</p>}
        {cfg.countdownEnabled && <Countdown target={cfg.weddingDate} />}
        <RumahLimas className={styles.house} />
        <span className="sk-rebung sk-rebung--bottom" aria-hidden="true" />
      </section>
    </>
  )
}

const UNITS = [
  ['days', 'Hari', 86_400_000],
  ['hours', 'Jam', 3_600_000],
  ['minutes', 'Menit', 60_000],
  ['seconds', 'Detik', 1000],
]

/** Client-only ticking countdown (renders nothing until mounted → no hydration drift). */
function Countdown({ target }) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const d = parseWeddingDate(target)
  if (!d || now === null) return null
  let left = Math.max(0, d.getTime() - now)
  return (
    <div className={styles.countdown} role="timer" aria-label="Hitung mundur hari pernikahan">
      {UNITS.map(([key, label, ms]) => {
        const v = Math.floor(left / ms)
        left -= v * ms
        return (
          <span key={key} className={styles.unit}>
            <span className={styles.unitValue}>{String(v).padStart(2, '0')}</span>
            <span className={styles.unitLabel}>{label}</span>
          </span>
        )
      })}
    </div>
  )
}
