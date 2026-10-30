'use client'

/* ============================================================
   Journey copy — the glass cards that float over the boat ride.

   Pure markup: the scene engine (engine/scene.js) fades these by their
   data-mu-panel attribute and `data-t` window ([in from, fully in, out from,
   gone] on the nominal timeline, config/timeline.js). Each card shows AFTER
   its landmark has popped up, while the boat drifts past it.

   `data-side` places a card on wide screens opposite its landmark, so the
   landmark stays in view (left landmark → card on the right). On phones every
   card sits at the bottom of the screen.
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react'
import { BEATS, MAX_GALLERY_PHOTOS, MAX_STORY_MOMENTS, storyBeats } from '../config/timeline.js'
import { calendarLink, formatEventDate, initials, parseEventDate, safeUrl } from '../utils/invite.js'

const t = (beat) => beat.join(',')

export function storyMoments(props) {
  return (Array.isArray(props.moments) ? props.moments : [])
    .filter((m) => m && (m.title || m.body))
    .slice(0, MAX_STORY_MOMENTS)
}

export function galleryPhotos(props) {
  return (Array.isArray(props.photos) ? props.photos : [])
    .map((p) => (typeof p === 'string' ? { src: p, alt: '' } : p))
    .filter((p) => p && p.src)
    .slice(0, MAX_GALLERY_PHOTOS)
}

function Panel({ beat, side = 'center', className = '', label, children }) {
  return (
    <section className={`mu-panel mu-side-${side}`} data-mu-panel data-t={t(beat)} aria-label={label}>
      <div className={`mu-glass mu-card ${className}`}>{children}</div>
    </section>
  )
}

export function OpeningPanel({ names, eyebrow, dateDots }) {
  return (
    <section className="mu-panel mu-side-center mu-opening" data-mu-panel data-t={t(BEATS.opening)} aria-label="Nama mempelai">
      <div className="mu-opening-text mu-shadowed">
        <span className="mu-label">{eyebrow}</span>
        <h2 className="mu-names">
          {names[0]}
          {names[1] && <span className="mu-amp">&amp;</span>}
          {names[1]}
        </h2>
        {dateDots && <span className="mu-date-line">{dateDots}</span>}
      </div>
    </section>
  )
}

export function QuotePanel({ props }) {
  return (
    <Panel beat={BEATS.quote} side="left" className="mu-quote-card" label="Kutipan">
      {props.label && <span className="mu-label">{props.label}</span>}
      {props.text && <p className="mu-quote">{props.text}</p>}
      {props.source && <span className="mu-cite">{props.source}</span>}
    </Panel>
  )
}

function Portrait({ src, alt, fallback }) {
  return (
    <div className="mu-portrait">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <span className="mu-initials">{fallback}</span>
      )}
    </div>
  )
}

function PersonCard({ beat, side, label, nickname, fullName, parents, photo }) {
  return (
    <Panel beat={beat} side={side} className="mu-person" label={label || nickname}>
      <Portrait src={photo} alt={`Foto ${nickname || fullName}`} fallback={initials(nickname || fullName)} />
      <div className="mu-person-text">
        {label && <span className="mu-label">{label}</span>}
        {nickname && <h2 className="mu-title">{nickname}</h2>}
        {fullName && <p className="mu-person-full">{fullName}</p>}
        {parents && <p className="mu-body">{parents}</p>}
      </div>
    </Panel>
  )
}

/** Shown under Jembatan Ampera, once it has been built. */
export function CoupleCards({ props }) {
  return (
    <>
      <PersonCard
        beat={BEATS.groom}
        side="right"
        label={props.groomLabel}
        nickname={props.groomNickname}
        fullName={props.groomFullName}
        parents={props.groomParents}
        photo={props.groomPhoto}
      />
      <PersonCard
        beat={BEATS.bride}
        side="left"
        label={props.brideLabel}
        nickname={props.brideNickname}
        fullName={props.brideFullName}
        parents={props.brideParents}
        photo={props.bridePhoto}
      />
    </>
  )
}

/** Benteng Kuto Besak (left bank) → the cards sit on the right. */
export function StoryPanels({ props }) {
  const moments = storyMoments(props)
  const beats = storyBeats(moments.length)
  return (
    <>
      {moments.map((m, i) => (
        <Panel key={m.id || i} beat={beats[i]} side="right" className="mu-story" label={m.title}>
          <span className="mu-label">
            {props.label || 'Kisah Kami'}
            {moments.length > 1 && <span className="mu-count"> · {i + 1}/{moments.length}</span>}
          </span>
          {m.year && <span className="mu-year">{m.year}</span>}
          {m.title && <h2 className="mu-title">{m.title}</h2>}
          {m.body && <p className="mu-body">{m.body}</p>}
        </Panel>
      ))}
    </>
  )
}

function useCountdown(target) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!target || now == null) return null
  const ms = Math.max(0, target.getTime() - now)
  const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Masjid Agung (left bank) → the card sits on the right. */
export function SaveDatePanel({ props, coupleNames, events }) {
  const date = parseEventDate(props.date, props.timezone)
  const f = formatEventDate(date, props.timezone)
  const left = useCountdown(props.showCountdown === false ? null : date)
  const cal = calendarLink({
    title: coupleNames ? `Pernikahan ${coupleNames}` : 'Undangan Pernikahan',
    start: date,
    location: [events?.venue, events?.address].filter(Boolean).join(', '),
  })
  return (
    <Panel beat={BEATS.saveDate} side="right" className="mu-date-card" label={props.label || 'Simpan Tanggal'}>
      {props.label && <span className="mu-label">{props.label}</span>}
      {f.day && <span className="mu-day">{f.day}</span>}
      {f.long && <h2 className="mu-title">{f.long}</h2>}
      {left && (
        <div className="mu-countdown" aria-label="Hitung mundur">
          {[
            ['d', 'Hari'],
            ['h', 'Jam'],
            ['m', 'Menit'],
            ['s', 'Detik'],
          ].map(([k, l]) => (
            <span className="mu-cd" key={k}>
              <b>{String(left[k]).padStart(2, '0')}</b>
              <i>{l}</i>
            </span>
          ))}
        </div>
      )}
      {cal && (
        <a className="mu-btn mu-ghost" href={cal} target="_blank" rel="noopener noreferrer">
          {props.calendarLabel || 'Simpan ke Kalender'}
        </a>
      )}
    </Panel>
  )
}

/** The Rumah Limas row and the rafts (right bank) → the card sits on the left. */
export function EventsPanel({ props }) {
  const events = (Array.isArray(props.events) ? props.events : []).filter((e) => e && e.title).slice(0, 3)
  const map = safeUrl(props.mapUrl)
  const live = safeUrl(props.liveUrl)
  return (
    <Panel beat={BEATS.events} side="left" className="mu-events" label={props.label || 'Rangkaian Acara'}>
      {props.label && <span className="mu-label">{props.label}</span>}
      <ul className="mu-event-list">
        {events.map((e, i) => (
          <li key={e.id || i}>
            <span className="mu-event-title">{e.title}</span>
            {e.time && <span className="mu-event-time">{e.time}</span>}
          </li>
        ))}
      </ul>
      {props.venue && <p className="mu-venue">{props.venue}</p>}
      {props.address && <p className="mu-body">{props.address}</p>}
      {(map || live) && (
        <div className="mu-actions">
          {map && (
            <a className="mu-btn mu-solid" href={map} target="_blank" rel="noopener noreferrer">
              {props.mapLabel || 'Buka Peta'}
            </a>
          )}
          {live && (
            <a className="mu-btn mu-ghost" href={live} target="_blank" rel="noopener noreferrer">
              {props.liveLabel || 'Tonton Live'}
            </a>
          )}
        </div>
      )}
    </Panel>
  )
}

/** The LRT, the pempek stalls and the kampung → a swipeable photo card on the left. */
export function GalleryPanel({ props, onOpen }) {
  const photos = galleryPhotos(props)
  const strip = useRef(null)
  const [index, setIndex] = useState(0)
  const go = (i) => {
    const el = strip.current
    if (!el) return
    const n = Math.max(0, Math.min(photos.length - 1, i))
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }
  if (!photos.length) return null
  return (
    <Panel beat={BEATS.gallery} side="left" className="mu-gallery" label={props.title || 'Galeri'}>
      {props.title && <span className="mu-label">{props.title}</span>}
      <div
        className="mu-strip"
        ref={strip}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
      >
        {photos.map((ph, i) => (
          <button key={`${ph.src}-${i}`} className="mu-shot" type="button" onClick={() => onOpen(ph)} aria-label={`Perbesar foto ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.src} alt={ph.alt || ''} loading="lazy" />
          </button>
        ))}
      </div>
      <div className="mu-strip-nav">
        <button className="mu-icon-btn" type="button" aria-label="Foto sebelumnya" onClick={() => go(index - 1)} disabled={index === 0}>
          ‹
        </button>
        <span className="mu-dots" aria-hidden="true">
          {photos.map((_, i) => (
            <i key={i} className={i === index ? 'mu-on' : ''} />
          ))}
        </span>
        <button className="mu-icon-btn" type="button" aria-label="Foto berikutnya" onClick={() => go(index + 1)} disabled={index >= photos.length - 1}>
          ›
        </button>
      </div>
      {props.hint && <p className="mu-hint-text">{props.hint}</p>}
    </Panel>
  )
}
