'use client'

/* ============================================================
   Musi — render shell.

   A Palembang wedding told as a journey: the Rumah Limas courtyard, a flight
   over South Sumatra, a boat ride down the Musi past its landmarks, and
   fireworks over the city at night. The 3D scene is one three.js canvas driven
   by scroll (engine/scene.js); the copy is React, in glass cards.

   Act 1 (cover → gallery) is the scroll-driven ride: at each landmark the boat
   rides in, the landmark pops up, then that section's card shows. Act 2 (RSVP,
   wishes, gift) scrolls normally over the night city so forms stay easy on a
   phone, while the camera lifts off the boat; the closing sits on a track of
   its own under the fireworks.

   Loaded with ssr:false from InvitationView (WebGL + window everywhere).
   ============================================================ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './styles/musi.css'
import { muSerif } from './fonts.js'

import { defaultConfig } from './defaultConfig.js'
import { DEFAULT_MUSI_PALETTE, MUSI_PALETTES, musiPalette } from './config/palettes.js'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import { buildTimeline } from './config/timeline.js'
import { mountScene } from './engine/scene.js'
import { formatEventDate, parseEventDate, readGuestName, readPreviewMode, readThemeParam } from './utils/invite.js'
import { startMusicBox } from './utils/musicBox.js'
import {
  CoupleCards,
  EventsPanel,
  GalleryPanel,
  HouseTour,
  OpeningPanel,
  QuotePanel,
  SaveDatePanel,
  StoryPanels,
  galleryPhotos,
  storyMoments,
} from './sections/Journey.jsx'
import { Closing, Cover, GiftSheet, RsvpSheet, WishesSheet } from './sections/Sheets.jsx'

import { coupleDisplay } from '@/lib/meta/couple'
import { resolveMusicSource } from '@/lib/music/source'
import { useYouTubePlayer } from '@/lib/music/useYouTubePlayer'
import { DeviceStage } from '@/components/preview/DeviceStage'
import { DEFAULT_DEVICE, getDevice } from '@/lib/preview/devicePresets'

/**
 * Owns the palette (and, on the demo, the 🎨 switcher's device pick). A
 * non-desktop device renders the invitation inside a bezel (DeviceStage, an
 * iframe of this page with ?embed=1) over the palette's backdrop instead of
 * the invitation itself. `embedSwitcher` = a demo shown in the phone frame
 * keeps the 🎨 (without the device picker).
 */
export default function Shell({ config: incoming, slug, isDemo = false, embed = false, embedSwitcher = false }) {
  const config = incoming && Array.isArray(incoming.sections) ? incoming : defaultConfig
  const [paletteKey, setPaletteKey] = useState(config.theme?.defaultPalette)
  const [device, setDevice] = useState(DEFAULT_DEVICE)
  useEffect(() => {
    const fromQuery = readThemeParam()
    if (isDemo && fromQuery && MUSI_PALETTES[fromQuery]) setPaletteKey(fromQuery)
  }, [isDemo])
  const activeKey = MUSI_PALETTES[paletteKey] ? paletteKey : DEFAULT_MUSI_PALETTE

  const preset = getDevice(device)
  const framed = !embed && preset.kind !== 'desktop'
  const showSwitcher = isDemo && (!embed || embedSwitcher)

  return (
    <>
      {framed ? (
        <>
          <div className="mu-framed-bg" style={{ background: MUSI_PALETTES[activeKey].preview.background }} aria-hidden="true" />
          <DeviceStage device={preset} payload={{ palette: activeKey }} />
        </>
      ) : (
        <Invitation
          config={config}
          slug={slug}
          isDemo={isDemo}
          embed={embed}
          paletteKey={activeKey}
          setPaletteKey={setPaletteKey}
        />
      )}
      {showSwitcher && (
        <PaletteSwitcher
          palette={activeKey}
          onPalette={setPaletteKey}
          device={device}
          onDevice={setDevice}
          hideDevices={embed}
        />
      )}
    </>
  )
}

function Invitation({ config, slug, isDemo, embed, paletteKey, setPaletteKey }) {
  const sections = config.sections || []
  const byType = (type) => sections.find((s) => s && s.type === type) || null
  const on = (type) => {
    const s = byType(type)
    return !!s && s.enabled !== false
  }
  const props = (type) => byType(type)?.props || {}

  const couple = config.couple || {}
  const names = [couple.name1, couple.name2].map((n) => String(n || '').trim()).filter(Boolean)
  const coupleNames = coupleDisplay(couple)
  const saveDate = props('musiSaveDate')
  const dateDots = formatEventDate(parseEventDate(saveDate.date, saveDate.timezone), saveDate.timezone).dots

  // ----- journey timeline: switched-off sections squeeze their stretch of the ride -----
  const storyCount = storyMoments(props('musiStory')).length
  const photoCount = galleryPhotos(props('musiGallery')).length
  const timeline = useMemo(() => {
    const enabled = new Set(sections.filter((s) => s && s.enabled !== false).map((s) => s.type))
    if (storyCount === 0) enabled.delete('musiStory')
    if (photoCount === 0) enabled.delete('musiGallery')
    return buildTimeline(enabled, { storyCount, photoCount })
  }, [sections, storyCount, photoCount])
  // the engine reads the CURRENT timeline through this ref, so editing the
  // config in the dashboard preview never rebuilds the 3D scene
  const timelineRef = useRef(timeline)
  timelineRef.current = timeline

  // ----- guest, preview, palette -----
  const [guest, setGuest] = useState('')
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setGuest(readGuestName())
    setPreview(readPreviewMode())
  }, [])
  const palette = musiPalette(paletteKey)
  // Demo (no live row) and the dashboard preview simulate RSVP/wish submissions.
  const simulated = !slug || preview

  // ----- wishes: saved notes are injected server-side as initialNotes -----
  const [notes, setNotes] = useState(() => {
    const list = props('guestbook').initialNotes
    return Array.isArray(list) ? list.filter((n) => n && n.message) : []
  })

  // ----- scene engine -----
  const rootRef = useRef(null)
  const engineRef = useRef(null)
  const paletteRef = useRef(palette)
  paletteRef.current = palette
  useEffect(() => {
    engineRef.current?.setPalette(palette)
  }, [palette])
  useEffect(() => {
    document.body.classList.add('musi-route')
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => document.body.classList.remove('musi-route')
  }, [])
  useEffect(() => {
    if (!embed) return undefined
    document.documentElement.classList.add('embed-scroll')
    return () => document.documentElement.classList.remove('embed-scroll')
  }, [embed])
  useEffect(() => {
    if (!rootRef.current) return undefined
    const timelineProxy = {
      toNominal: (p) => timelineRef.current.toNominal(p),
      toProgress: (t) => timelineRef.current.toProgress(t),
    }
    const engine = mountScene(rootRef.current, { timeline: timelineProxy, palette: paletteRef.current })
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])
  // cards come and go with the config: let the engine re-read them
  useEffect(() => {
    engineRef.current?.refresh()
  })

  // ----- cover: the page stays locked until the guest opens the invitation -----
  const [opened, setOpened] = useState(false)
  const [hint, setHint] = useState(false)
  // The cover belongs to the start of the journey, never over the middle of
  // it: a reload (or the browser restoring its scroll position after this
  // effect runs) puts the guest back at the top while it is shown.
  useEffect(() => {
    if (opened) return undefined
    document.documentElement.classList.add('mu-locked')
    const toTop = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    toTop()
    window.addEventListener('scroll', toTop, { passive: true })
    window.addEventListener('load', toTop)
    window.addEventListener('pageshow', toTop)
    return () => {
      document.documentElement.classList.remove('mu-locked')
      window.removeEventListener('scroll', toTop)
      window.removeEventListener('load', toTop)
      window.removeEventListener('pageshow', toTop)
    }
  }, [opened])

  // ----- music: the couple's song (Music tab), or the plucked tune on the demo -----
  const music = config.music || {}
  const source = music.enabled === false ? null : resolveMusicSource(music)
  const yt = useYouTubePlayer({ youtubeId: source?.kind === 'youtube' ? source.youtubeId : null })
  const audioRef = useRef(null)
  const boxRef = useRef(null)
  const hasMusic = !!source || isDemo
  const [playing, setPlaying] = useState(false)
  const setMusic = useCallback(
    (play) => {
      try {
        if (source?.kind === 'audio' && audioRef.current) {
          if (play) audioRef.current.play().catch(() => {})
          else audioRef.current.pause()
        } else if (source?.kind === 'youtube') {
          if (play) yt.play()
          else yt.pause()
        } else if (isDemo) {
          if (play && !boxRef.current) boxRef.current = startMusicBox()
          if (play) boxRef.current?.play()
          else boxRef.current?.pause()
        }
      } catch {
        /* music is optional */
      }
      setPlaying(play)
    },
    [source?.kind, yt, isDemo],
  )
  useEffect(() => () => boxRef.current?.destroy(), [])
  useEffect(() => {
    const onVis = () => {
      if (!playing) return
      if (document.hidden) {
        audioRef.current?.pause()
        boxRef.current?.pause()
      } else if (source?.kind === 'audio') audioRef.current?.play().catch(() => {})
      else boxRef.current?.play()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [playing, source?.kind])

  const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const openInvitation = () => {
    setOpened(true)
    engineRef.current?.open()
    if (hasMusic) setMusic(true)
    const delay = reduceMotion() ? 0 : 900
    setTimeout(() => {
      document.documentElement.classList.remove('mu-locked')
      setHint(true)
      // a short glide forward, so the journey visibly starts
      engineRef.current?.scrollToNominal(0.012, true)
    }, delay)
  }

  // ----- embed bridge: the landing explorer pushes the chosen palette -----
  useEffect(() => {
    if (!embed) return undefined
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      const key = d?.payload?.palette || d?.payload?.theme
      if (d?.source === 'fincards-preview' && d?.kind === 'theme' && MUSI_PALETTES[key]) setPaletteKey(key)
    }
    window.addEventListener('message', onMsg)
    try {
      window.parent?.postMessage({ source: 'fincards-preview', kind: 'ready' }, window.location.origin)
    } catch {
      /* not framed */
    }
    return () => window.removeEventListener('message', onMsg)
  }, [embed, setPaletteKey])

  // ----- lightbox -----
  const [zoom, setZoom] = useState(null)
  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (e) => e.key === 'Escape' && setZoom(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const onWishSent = (note) => {
    setNotes((list) => [note, ...list])
    engineRef.current?.launchFirework()
  }
  const rsvpRef = useRef(null)
  const goToRsvp = () => rsvpRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
  const [debugFps, setDebugFps] = useState(false)
  useEffect(() => {
    try {
      setDebugFps(new URLSearchParams(window.location.search).get('fps') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const vars = {
    '--mu-gold': palette.gold,
    '--mu-blush': palette.blush,
    '--mu-ink': palette.ink,
    '--mu-tint': palette.glass,
    '--mu-on-gold': palette.onGold,
    '--mu-nogl': palette.preview.background,
  }

  return (
    <div ref={rootRef} className={`mu ${muSerif.variable}${opened ? ' mu-open' : ''}`} style={vars}>
      <main className="mu-frame">
        <div className="mu-scene" aria-hidden="true">
          <canvas className="mu-canvas" data-mu-canvas />
          <div className="mu-nogl-bg" />
          <div className="mu-cover-veil" />
          <div className="mu-flash" data-mu-flash />
          <div className="mu-fade" data-mu-fade />
          <span className="mu-pin" data-mu-pin>
            <b>Palembang</b>
          </span>
        </div>

        <div className="mu-copy" data-mu-copy>
          <Cover props={props('musiCover')} names={names} dateDots={dateDots} guest={guest} onOpen={openInvitation} />
          <OpeningPanel names={names} eyebrow={props('musiCover').eyebrow || 'Pernikahan'} dateDots={dateDots} />
          <HouseTour coupleNames={coupleNames} />
          {on('musiQuote') && <QuotePanel props={props('musiQuote')} />}
          {on('musiCouple') && <CoupleCards props={props('musiCouple')} />}
          {on('musiStory') && <StoryPanels props={props('musiStory')} />}
          {on('musiSaveDate') && <SaveDatePanel props={saveDate} coupleNames={coupleNames} events={props('musiEvents')} />}
          {on('musiEvents') && <EventsPanel props={props('musiEvents')} />}
          {on('musiGallery') && <GalleryPanel props={props('musiGallery')} onOpen={setZoom} />}
        </div>

        <nav className="mu-rail" aria-hidden="true">
          <span className="mu-rail-label" data-mu-chapter>Rumah Limas</span>
          <span className="mu-rail-track">
            <i data-mu-rail-fill />
          </span>
        </nav>
        <div className="mu-hint mu-shadowed" data-mu-hint hidden={!hint}>
          <span>Gulir perlahan</span>
          <i />
        </div>
        {isDemo && <span className="mu-badge">Contoh undangan</span>}
        {debugFps && <span className="mu-fps" data-mu-fps />}
      </main>

      <div className="mu-track" data-mu-track style={{ height: `${timeline.trackVh}vh` }} aria-hidden="true" />

      <div className="mu-act2" data-mu-act2>
        {on('musiRsvp') && (
          <div ref={rsvpRef} className="mu-act2-slot">
            <RsvpSheet props={props('musiRsvp')} slug={slug} simulated={simulated} guestName={guest} key={`rsvp-${guest}`} />
          </div>
        )}
        {on('guestbook') && (
          <div className="mu-act2-slot">
            <WishesSheet
              props={props('guestbook')}
              notes={notes}
              slug={slug}
              simulated={simulated}
              guestName={guest}
              onSent={onWishSent}
              key={`wish-${guest}`}
            />
          </div>
        )}
        {on('musiGift') && (
          <div className="mu-act2-slot">
            <GiftSheet props={props('musiGift')} />
          </div>
        )}
        {/* The closing is a scroll track of its own: the fireworks build up
            over the city and the closing fades in (engine/scene.js). */}
        <div className="mu-finale" data-mu-finale>
          <div className="mu-finale-stage">
            <div className="mu-finale-closing" data-mu-closing>
              <Closing
                props={props('musiClosing')}
                names={names}
                hasRsvp={on('musiRsvp')}
                onRsvp={goToRsvp}
                onBack={() => engineRef.current?.backToStart()}
              />
            </div>
          </div>
        </div>
      </div>

      {source?.kind === 'audio' && <audio ref={audioRef} src={source.url} loop preload="none" />}
      {opened && (
        <div className="mu-controls">
          <button className="mu-btn mu-ghost mu-sm" type="button" onClick={() => engineRef.current?.skipToEnd()}>
            Lewati ke akhir
          </button>
          {hasMusic && (
            <button
              className="mu-icon-btn mu-music-btn"
              type="button"
              aria-pressed={playing}
              aria-label={playing ? 'Matikan musik' : 'Nyalakan musik'}
              onClick={() => setMusic(!playing)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18V5l11-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="17" cy="16" r="3" />
              </svg>
            </button>
          )}
        </div>
      )}

      {zoom && (
        <div className="mu-lightbox" role="dialog" aria-modal="true" aria-label="Foto" onClick={(e) => e.target === e.currentTarget && setZoom(null)}>
          <button className="mu-icon-btn mu-lb-close" type="button" aria-label="Tutup" onClick={() => setZoom(null)} autoFocus>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.alt || ''} />
        </div>
      )}
    </div>
  )
}
