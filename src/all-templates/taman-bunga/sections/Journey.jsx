'use client'

/* ============================================================
   Journey copy — the text that floats over the painted walk.

   Pure markup: the scene engine (engine/scene.js) fades and moves these by
   their data-tb-* attributes and `data-t` windows ([in from, fully in,
   out from, gone] on the nominal timeline, see config/timeline.js).
   ============================================================ */
import React, { useEffect, useState } from 'react'
import { BEATS, storyBeats, MAX_STORY_MOMENTS } from '../config/timeline.js'
import { SCENE } from '../config/assets.js'
import { calendarLink, formatEventDate, initials, parseEventDate, safeUrl } from '../utils/invite.js'

const t = (beat) => beat.join(',')

export function OpeningPanel({ names, eyebrow, dateDots }) {
  return (
    <section className="tb-panel tb-shadowed" data-tb-panel data-t={t(BEATS.opening)} style={{ '--top': '21%' }}>
      <span className="tb-label">{eyebrow}</span>
      <h2 className="tb-script tb-names">
        {names[0]}
        {names[1] && <span className="tb-amp">&amp;</span>}
        {names[1]}
      </h2>
      {dateDots && <span className="tb-date-line">{dateDots}</span>}
    </section>
  )
}

export function QuotePanel({ props }) {
  return (
    <section className="tb-panel tb-shadowed" data-tb-panel data-t={t(BEATS.quote)} style={{ '--top': '17%' }}>
      {props.label && <span className="tb-label">{props.label}</span>}
      {props.text && <p className="tb-quote">{props.text}</p>}
      {props.source && <span className="tb-cite">{props.source}</span>}
    </section>
  )
}

/** Rose-arch frame with a solid backing plate; the photo drifts inside its window. */
export function Portrait({ src, alt, fallback, fit = false, mirror = false, small = false, sill = false }) {
  return (
    <div className={`tb-portrait${small ? ' tb-small' : ''}${mirror ? ' tb-mirror' : ''}${fit ? ' tb-fit' : ''}`} data-tb-portrait>
      <img className="tb-frame-back" src={SCENE.frameBack} alt="" />
      <div className="tb-window">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="tb-photo" src={src} alt={alt} data-tb-photo />
        ) : (
          <span className="tb-initials" data-tb-photo>{fallback}</span>
        )}
      </div>
      {sill && <img className="tb-sill" src={SCENE.front} alt="" />}
      <img className="tb-frame-art" src={SCENE.frame} alt="" />
    </div>
  )
}

function PersonCard({ beat, label, nickname, fullName, parents, photo, mirror }) {
  return (
    <section className={`tb-card tb-shadowed${mirror ? ' tb-mirror' : ''}`} data-tb-card data-t={t(beat)}>
      <Portrait src={photo} alt={`Foto ${nickname || fullName}`} fallback={initials(nickname || fullName)} fit mirror={mirror} sill />
      <div className="tb-card-text">
        {label && <span className="tb-label">{label}</span>}
        {nickname && <h2 className="tb-script tb-person-name">{nickname}</h2>}
        {fullName && <p className="tb-person-full">{fullName}</p>}
        {parents && <p className="tb-parents">{parents}</p>}
      </div>
    </section>
  )
}

export function CoupleCards({ props }) {
  return (
    <>
      <PersonCard
        beat={BEATS.groom}
        label={props.groomLabel}
        nickname={props.groomNickname}
        fullName={props.groomFullName}
        parents={props.groomParents}
        photo={props.groomPhoto}
      />
      <PersonCard
        beat={BEATS.bride}
        label={props.brideLabel}
        nickname={props.brideNickname}
        fullName={props.brideFullName}
        parents={props.brideParents}
        photo={props.bridePhoto}
        mirror
      />
    </>
  )
}

export function storyMoments(props) {
  const list = Array.isArray(props?.moments) ? props.moments : []
  return list.filter((m) => m && (m.title || m.body || m.year)).slice(0, MAX_STORY_MOMENTS)
}

export function StoryPanels({ props }) {
  const moments = storyMoments(props)
  const beats = storyBeats(moments.length)
  return moments.map((m, i) => (
    <section key={m.id || i} className="tb-panel tb-shadowed" data-tb-panel data-t={t(beats[i])} style={{ '--top': '9%' }}>
      {props.label && <span className="tb-label">{props.label}</span>}
      {m.year && <span className="tb-script tb-story-year">{m.year}</span>}
      {m.title && <h3 className="tb-story-title">{m.title}</h3>}
      {m.body && <p className="tb-story-body">{m.body}</p>}
    </section>
  ))
}

function Countdown({ target }) {
  const [left, setLeft] = useState(() => (target ? target.getTime() - Date.now() : 0))
  useEffect(() => {
    if (!target) return undefined
    const tick = () => setLeft(target.getTime() - Date.now())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [target])
  let s = Math.max(0, Math.floor(left / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  return (
    <div className="tb-countdown" aria-label="Hitung mundur">
      <div><b>{d}</b><span>Hari</span></div>
      <div><b>{String(h).padStart(2, '0')}</b><span>Jam</span></div>
      <div><b>{String(m).padStart(2, '0')}</b><span>Menit</span></div>
    </div>
  )
}

export function SaveDatePanel({ props, coupleNames, events }) {
  const start = parseEventDate(props.date, props.timezone)
  const f = formatEventDate(start, props.timezone)
  const href = calendarLink({
    title: coupleNames ? `Pernikahan ${coupleNames}` : 'Undangan Pernikahan',
    start,
    location: [events?.venue, events?.address].filter(Boolean).join(', '),
    details: (events?.events || []).map((e) => [e.title, e.time].filter(Boolean).join(' ')).join(', '),
  })
  return (
    <section className="tb-panel tb-shadowed" data-tb-panel data-t={t(BEATS.saveDate)} style={{ '--top': '9%' }}>
      {props.label && <span className="tb-label">{props.label}</span>}
      {f.day && <h2 className="tb-script tb-day">{f.day}</h2>}
      {f.long && <p className="tb-full-date">{f.long}</p>}
      <hr className="tb-rule" />
      {props.showCountdown !== false && start && <Countdown target={start} />}
      {href && (
        <div className="tb-actions">
          <a className="tb-pill-btn" href={href} target="_blank" rel="noopener noreferrer">
            {props.calendarLabel || 'Simpan ke Kalender'}
          </a>
        </div>
      )}
    </section>
  )
}

export function EventsPanel({ props }) {
  const list = (Array.isArray(props.events) ? props.events : []).filter((e) => e && (e.title || e.time)).slice(0, 3)
  const map = safeUrl(props.mapUrl)
  const live = safeUrl(props.liveUrl)
  return (
    <section className="tb-panel tb-shadowed" data-tb-panel data-t={t(BEATS.events)} style={{ '--top': '6%' }}>
      {props.label && <span className="tb-label">{props.label}</span>}
      {list.length > 0 && (
        <div className="tb-events">
          {list.map((e, i) => (
            <div className="tb-event" key={e.id || i}>
              {e.title && <h3 className="tb-script tb-event-title">{e.title}</h3>}
              {e.time && <span className="tb-event-time">{e.time}</span>}
            </div>
          ))}
        </div>
      )}
      <hr className="tb-rule" />
      {props.venue && <p className="tb-venue">{props.venue}</p>}
      {props.address && <p className="tb-address">{props.address}</p>}
      {(map || live) && (
        <div className="tb-actions">
          {map && <a className="tb-pill-btn" href={map} target="_blank" rel="noopener noreferrer">{props.mapLabel || 'Buka Peta'}</a>}
          {live && <a className="tb-pill-btn" href={live} target="_blank" rel="noopener noreferrer">{props.liveLabel || 'Tonton Live'}</a>}
        </div>
      )}
    </section>
  )
}

export function galleryPhotos(props) {
  const list = Array.isArray(props?.photos) ? props.photos : []
  return list
    .map((p) => (typeof p === 'string' ? { src: p, alt: '' } : p))
    .filter((p) => p && typeof p.src === 'string' && p.src.trim())
    .slice(0, 30)
}

/**
 * One wooden easel standing in the garden, holding the photos as a pad of
 * prints. The engine walks it into view and, as the guest scrolls, lifts the
 * top print by its bottom edge, swings it over the board and drops it behind,
 * showing the next (engine/scene.js, renderCopy). Tap a print to enlarge it.
 */
export function Gallery({ props, onOpen }) {
  const photos = galleryPhotos(props)
  return (
    <section className="tb-gallery tb-shadowed" data-tb-gallery data-t={t(BEATS.gallery)}>
      <div className="tb-easel" data-tb-easel>
        <svg className="tb-easel-wood" viewBox="0 0 300 560" aria-hidden="true">
          <defs>
            <linearGradient id="tb-wood" x1="0" x2="1">
              <stop offset="0" style={{ stopColor: '#5e3a20' }} />
              <stop offset="0.45" style={{ stopColor: '#b07a4c' }} />
              <stop offset="1" style={{ stopColor: '#8a5a36' }} />
            </linearGradient>
          </defs>
          {/* back leg, mast, front legs, cross bar, ledge */}
          <path d="M150 70 L176 548" stroke="#4a2e18" strokeWidth="10" strokeLinecap="round" />
          <rect x="143" y="34" width="14" height="396" rx="3" fill="url(#tb-wood)" />
          <path d="M140 52 L38 556" stroke="url(#tb-wood)" strokeWidth="15" strokeLinecap="round" />
          <path d="M160 52 L262 556" stroke="url(#tb-wood)" strokeWidth="15" strokeLinecap="round" />
          <rect x="68" y="438" width="164" height="9" rx="3" fill="url(#tb-wood)" />
          <rect x="10" y="362" width="280" height="20" rx="4" fill="url(#tb-wood)" />
          <rect x="10" y="378" width="280" height="6" rx="2" fill="#4a2e18" opacity="0.7" />
        </svg>
        <div className="tb-easel-board">
          <div className="tb-easel-backing" />
          {photos.map((p, i) => (
            <div key={`${p.src}-${i}`} className="tb-page" data-tb-page style={{ zIndex: photos.length - i }}>
              <button type="button" className="tb-page-front" aria-label={`Perbesar foto ${p.alt || i + 1}`} onClick={() => onOpen(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt || ''} loading={i < 2 ? 'eager' : 'lazy'} />
                <i className="tb-page-shade" />
              </button>
              <div className="tb-page-back" aria-hidden="true">
                <i className="tb-page-shade" />
              </div>
            </div>
          ))}
          <span className="tb-easel-clip" aria-hidden="true" />
        </div>
      </div>
      <div className="tb-gallery-caption" data-tb-gallery-caption>
        {props.title && <h2 className="tb-script">{props.title}</h2>}
        {props.hint && photos.length > 0 && <p>{props.hint}</p>}
      </div>
    </section>
  )
}
