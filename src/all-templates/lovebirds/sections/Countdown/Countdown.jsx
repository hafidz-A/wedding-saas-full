'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import styles from './Countdown.module.css'

const DEFAULTS = {
  weddingDate: '2025-11-15T16:00:00+07:00',
  eyebrow: 'Save the date',
  title: 'Menuju Hari Bahagia',
  subtitle: '',
  messageDuring: 'Hari ini, kami menikah!',
  messageAfter: 'Terima kasih telah menjadi bagian dari kisah kami.',
  labels: { days: 'Hari', hours: 'Jam', minutes: 'Menit', seconds: 'Detik' },
  style: 'card',
  // Add-to-Calendar (optional — feature renders only in `countdown` mode)
  calendarEnabled: true,
  calendarLabel: 'Tambah ke Kalender',
  calendarTitle: '',          // event SUMMARY — falls back to section `title`
  calendarLocation: '',       // event LOCATION
  calendarDescription: '',    // event DESCRIPTION
  calendarDurationHours: 4,   // event length in hours
}

const pad = (n) => String(Math.max(0, n)).padStart(2, '0')

function computeDiff(targetMs, nowMs) {
  const diff = targetMs - nowMs
  if (diff <= 0) return { diff, days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    diff,
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export default function Countdown(props) {
  const merged = {
    ...DEFAULTS,
    ...props,
    labels: { ...DEFAULTS.labels, ...(props.labels || {}) },
  }
  const {
    weddingDate, eyebrow, title, subtitle,
    messageDuring, messageAfter, labels, style,
    calendarEnabled, calendarLabel, calendarTitle,
    calendarLocation, calendarDescription, calendarDurationHours,
  } = merged

  const targetMs = useMemo(() => new Date(weddingDate).getTime(), [weddingDate])

  // SSR-safe: render placeholders until first client tick, then update every 1s.
  // Keeps server + client first paint identical (no hydration mismatch).
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const ready = now != null
  const { diff, days, hours, minutes, seconds } = ready
    ? computeDiff(targetMs, now)
    : { diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }

  let mode = 'countdown'
  if (ready && diff <= 0) {
    mode = diff > -86400000 ? 'during' : 'after'
  }

  // Live announcement only re-evaluates when minute (or larger) ticks over —
  // screen readers don't get spammed every second.
  const ariaText = useMemo(() => {
    if (!ready) return ''
    if (mode === 'during') return messageDuring
    if (mode === 'after') return messageAfter
    return `${days} ${labels.days}, ${hours} ${labels.hours}, ${minutes} ${labels.minutes} menuju pernikahan`
  }, [ready, mode, days, hours, minutes, labels.days, labels.hours, labels.minutes, messageDuring, messageAfter])

  const variantClass =
    style === 'mono'   ? styles.styleMono :
    style === 'italic' ? styles.styleItalic :
                         styles.styleCard

  return (
    <section className={styles.section} aria-label={title}>
      <Floral side="left" />
      <Floral side="right" />

      <motion.div
        className={styles.inner}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className={styles.header}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        {mode === 'countdown' && (
          <>
            <div className={`${styles.timer} ${variantClass}`} role="timer">
              <Unit value={ready ? String(days) : '—'} label={labels.days} />
              <Separator visible={style === 'mono'} />
              <Unit value={ready ? pad(hours)   : '—'} label={labels.hours} />
              <Separator visible={style === 'mono'} />
              <Unit value={ready ? pad(minutes) : '—'} label={labels.minutes} />
              <Separator visible={style === 'mono'} />
              <Unit value={ready ? pad(seconds) : '—'} label={labels.seconds} />
            </div>

            {calendarEnabled && (
              <AddToCalendar
                date={weddingDate}
                durationHours={calendarDurationHours}
                title={calendarTitle || title}
                location={calendarLocation}
                description={calendarDescription}
                label={calendarLabel}
              />
            )}
          </>
        )}

        {mode === 'during' && (
          <p className={styles.message} role="status">{messageDuring}</p>
        )}
        {mode === 'after' && (
          <p className={styles.message} role="status">{messageAfter}</p>
        )}

        {/* Polite live region: only the per-minute summary, hidden visually. */}
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {ariaText}
        </div>
      </motion.div>
    </section>
  )
}

function Unit({ value, label }) {
  return (
    <div className={styles.unit}>
      <span className={styles.numberWrap}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            className={styles.number}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}

function Separator({ visible }) {
  if (!visible) return null
  return <span className={styles.separator} aria-hidden="true">:</span>
}

/* ---------- Add-to-Calendar -------------------------------------------------
   One pill button → dropdown with Google / Apple (.ics) / Outlook.
   - Google + Outlook open in a new tab (web URL templates)
   - Apple/iCal downloads an .ics blob (universal — also works on iPhone)
   - Closes on outside click + Escape
---------------------------------------------------------------------------- */
function AddToCalendar({ date, durationHours = 4, title, location, description, label }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const start = new Date(date)
  const end = new Date(start.getTime() + (Number(durationHours) || 4) * 3600000)

  // "20251115T090000Z" — UTC stamp format used by Google/Outlook URLs and iCal
  const fmtUTC = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const startUTC = fmtUTC(start)
  const endUTC   = fmtUTC(end)
  const encTitle = encodeURIComponent(title || 'Wedding')
  const encLoc   = encodeURIComponent(location || '')
  const encDesc  = encodeURIComponent(description || '')

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encTitle}` +
    `&dates=${startUTC}/${endUTC}` +
    `&details=${encDesc}` +
    `&location=${encLoc}`

  const outlookUrl =
    `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose` +
    `&rru=addevent` +
    `&startdt=${start.toISOString()}` +
    `&enddt=${end.toISOString()}` +
    `&subject=${encTitle}` +
    `&body=${encDesc}` +
    `&location=${encLoc}`

  const downloadIcs = () => {
    // RFC 5545 minimal VEVENT — \r\n line endings, escape commas/semicolons
    const esc = (s) => String(s || '').replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding//Countdown//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${start.getTime()}-${Math.random().toString(36).slice(2, 8)}@wedding`,
      `DTSTAMP:${fmtUTC(new Date())}`,
      `DTSTART:${startUTC}`,
      `DTEND:${endUTC}`,
      `SUMMARY:${esc(title || 'Wedding')}`,
      `LOCATION:${esc(location)}`,
      `DESCRIPTION:${esc(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'wedding').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setOpen(false)
  }

  return (
    <div className={styles.calendarWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.calendarButton}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg className={styles.calendarIcon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3.5" y1="10" x2="20.5" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className={styles.calendarMenu}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.calendarOption}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Google Calendar
            </a>
            <button
              type="button"
              className={styles.calendarOption}
              role="menuitem"
              onClick={downloadIcs}
            >
              Apple Calendar
            </button>
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.calendarOption}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Outlook
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Floral({ side }) {
  return (
    <svg
      className={`${styles.floral} ${side === 'left' ? styles.floralLeft : styles.floralRight}`}
      viewBox="0 0 200 400"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M100 0 Q 60 80, 100 160 T 100 320 T 100 400" />
        <path d="M100 60 Q 130 80, 150 110" />
        <path d="M100 100 Q 70 120, 50 150" />
        <path d="M100 160 Q 140 180, 160 220" />
        <path d="M100 220 Q 60 240, 40 280" />
        <path d="M100 290 Q 140 305, 160 335" />
        <circle cx="150" cy="110" r="6" />
        <circle cx="50"  cy="150" r="5" />
        <circle cx="160" cy="220" r="7" />
        <circle cx="40"  cy="280" r="6" />
        <circle cx="160" cy="335" r="5" />
      </g>
    </svg>
  )
}
