'use client'

/* ============================================================
   Taman Bunga — render shell.

   A walk through a flower garden from dusk to night. The painted scene is a
   single canvas driven by scroll (engine/scene.js); the copy is React. Act 1
   (cover → gallery) is the scroll-driven walk; act 2 (RSVP, wishes, gift,
   closing) scrolls normally over the night garden so forms stay comfortable
   to fill on a phone, while the walk to the gazebo keeps going behind them.

   Loaded with ssr:false from InvitationView (canvas + window everywhere).
   ============================================================ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './styles/taman-bunga.css'
import { tbSerif } from './fonts.js'

import { defaultConfig } from './defaultConfig.js'
import { DEFAULT_TAMAN_BUNGA_PALETTE, tamanBungaPalette, TAMAN_BUNGA_PALETTES } from './config/palettes.js'
import { SCENE } from './config/assets.js'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import { buildTimeline, lanternStops } from './config/timeline.js'
import { mountScene } from './engine/scene.js'
import { formatEventDate, parseEventDate, readGuestName, readPreviewMode, readThemeParam } from './utils/invite.js'
import { startMusicBox } from './utils/musicBox.js'
import {
  CoupleCards,
  EventsPanel,
  Gallery,
  OpeningPanel,
  QuotePanel,
  SaveDatePanel,
  StoryPanels,
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
 * iframe of this page with ?embed=1) over a painted backdrop instead of the
 * invitation itself. `embedSwitcher` = a demo shown in the phone frame keeps
 * the 🎨 (without the device picker).
 */
export default function Shell({ config: incoming, slug, isDemo = false, embed = false, embedSwitcher = false }) {
  const config = incoming && Array.isArray(incoming.sections) ? incoming : defaultConfig
  const [paletteKey, setPaletteKey] = useState(config.theme?.defaultPalette)
  const [device, setDevice] = useState(DEFAULT_DEVICE)
  useEffect(() => {
    const fromQuery = readThemeParam()
    if (isDemo && fromQuery && TAMAN_BUNGA_PALETTES[fromQuery]) setPaletteKey(fromQuery)
  }, [isDemo])
  const activeKey = TAMAN_BUNGA_PALETTES[paletteKey] ? paletteKey : DEFAULT_TAMAN_BUNGA_PALETTE

  const preset = getDevice(device)
  const framed = !embed && preset.kind !== 'desktop'
  const showSwitcher = isDemo && (!embed || embedSwitcher)

  return (
    <>
      {framed ? (
        <>
          <div
            className="tb-framed-bg"
            style={{ backgroundImage: `url(${SCENE.gardenWide}), ${TAMAN_BUNGA_PALETTES[activeKey].preview.background}` }}
            aria-hidden="true"
          />
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
  const saveDate = props('tbSaveDate')
  const dateDots = formatEventDate(parseEventDate(saveDate.date, saveDate.timezone), saveDate.timezone).dots

  // ----- journey timeline: switched-off sections squeeze their stretch of the walk -----
  const storyCount = storyMoments(props('tbStory')).length
  const timeline = useMemo(() => {
    const enabled = new Set(sections.filter((s) => s && s.enabled !== false).map((s) => s.type))
    if (storyCount === 0) enabled.delete('tbStory')
    return {
      ...buildTimeline(enabled),
      lanterns: lanternStops(storyCount, enabled.has('tbStory')),
    }
  }, [sections, storyCount])

  // ----- guest, preview, palette -----
  const [guest, setGuest] = useState('')
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setGuest(readGuestName())
    setPreview(readPreviewMode())
  }, [])
  const palette = tamanBungaPalette(paletteKey)
  // Demo (no live row) and the dashboard preview simulate RSVP/wish submissions.
  const simulated = !slug || preview

  // ----- wishes wall: saved notes are injected server-side as initialNotes -----
  const [notes, setNotes] = useState(() => {
    const list = props('guestbook').initialNotes
    return Array.isArray(list) ? list.filter((n) => n && n.message) : []
  })

  // ----- scene engine -----
  const rootRef = useRef(null)
  const engineRef = useRef(null)
  const notesAtMount = useRef(notes.length)
  // the night over the painting takes the palette's colours too
  const paletteRef = useRef(palette)
  paletteRef.current = palette
  useEffect(() => {
    engineRef.current?.setNight(palette.night)
  }, [palette])
  useEffect(() => {
    document.body.classList.add('taman-bunga-route')
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => document.body.classList.remove('taman-bunga-route')
  }, [])
  useEffect(() => {
    if (!embed) return undefined
    document.documentElement.classList.add('embed-scroll')
    return () => document.documentElement.classList.remove('embed-scroll')
  }, [embed])
  useEffect(() => {
    if (!rootRef.current) return undefined
    const engine = mountScene(rootRef.current, {
      toNominal: timeline.toNominal,
      lanternStops: timeline.lanterns,
      wishCount: notesAtMount.current,
    })
    engineRef.current = engine
    engine.setNight(paletteRef.current.night)
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [timeline])

  // ----- cover: the page stays locked until the guest opens the gate -----
  const [opened, setOpened] = useState(false)
  const [hint, setHint] = useState(false)
  useEffect(() => {
    if (opened) return undefined
    document.documentElement.classList.add('tb-locked')
    return () => document.documentElement.classList.remove('tb-locked')
  }, [opened])

  // ----- music: the couple's song (Music tab), or the music box on the demo -----
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
    const delay = reduceMotion() ? 0 : 1200
    setTimeout(() => {
      document.documentElement.classList.remove('tb-locked')
      setHint(true)
    }, delay)
  }

  // ----- embed bridge: the landing explorer pushes the chosen palette -----
  useEffect(() => {
    if (!embed) return undefined
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      const key = d?.payload?.palette || d?.payload?.theme
      if (d?.source === 'fincards-preview' && d?.kind === 'theme' && TAMAN_BUNGA_PALETTES[key]) setPaletteKey(key)
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
    engineRef.current?.launchLantern(note.name)
  }

  const vars = {
    '--tb-gold': palette.gold,
    '--tb-blush': palette.blush,
    '--tb-ink': palette.ink,
    '--tb-glass': palette.glass,
    '--tb-on-gold': palette.onGold,
  }

  return (
    <div ref={rootRef} className={`tb ${tbSerif.variable}${opened ? ' tb-open' : ''}`} style={vars}>
      <main className="tb-frame">
        <div className="tb-scene" aria-hidden="true">
          <canvas className="tb-scene-cv" data-tb-canvas />
          <div className="tb-cover-veil" />
        </div>

        <div className="tb-copy" data-tb-copy>
          <Cover props={props('tbCover')} names={names} dateDots={dateDots} guest={guest} onOpen={openInvitation} />
          <OpeningPanel names={names} eyebrow={props('tbCover').eyebrow || 'The Wedding of'} dateDots={dateDots} />
          {on('tbQuote') && <QuotePanel props={props('tbQuote')} />}
          {on('tbCouple') && <CoupleCards props={props('tbCouple')} />}
          {on('tbStory') && <StoryPanels props={props('tbStory')} />}
          {on('tbSaveDate') && <SaveDatePanel props={saveDate} coupleNames={coupleNames} events={props('tbEvents')} />}
          {on('tbEvents') && <EventsPanel props={props('tbEvents')} />}
          {on('tbGallery') && <Gallery props={props('tbGallery')} onOpen={setZoom} />}
        </div>

        <div className="tb-hint tb-shadowed" data-tb-hint hidden={!hint}>
          <span>Gulir perlahan</span>
          <i />
        </div>
        {isDemo && <span className="tb-badge">Contoh undangan</span>}
      </main>

      <div className="tb-track" data-tb-track style={{ height: `${timeline.trackVh}vh` }} aria-hidden="true" />

      <div className="tb-act2" data-tb-act2>
        {on('tbRsvp') && <RsvpSheet props={props('tbRsvp')} slug={slug} simulated={simulated} guestName={guest} key={`rsvp-${guest}`} />}
        {on('guestbook') && (
          <WishesSheet
            props={props('guestbook')}
            notes={notes}
            slug={slug}
            simulated={simulated}
            guestName={guest}
            onSent={onWishSent}
            key={`wish-${guest}`}
          />
        )}
        {on('tbGift') && <GiftSheet props={props('tbGift')} />}
        {/* The closing is a scroll track of its own: the walk goes up the
            gazebo steps and inside (engine/scene.js), and the closing shows
            once we are in. The engine sets the stage's opacity. */}
        <div className="tb-gazebo" data-tb-gazebo>
          <div className="tb-gazebo-stage">
            <div className="tb-gazebo-closing" data-tb-closing>
              <Closing props={props('tbClosing')} names={names} />
            </div>
          </div>
        </div>
      </div>

      {source?.kind === 'audio' && <audio ref={audioRef} src={source.url} loop preload="none" />}
      {opened && hasMusic && (
        <button
          className="tb-music-btn"
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

      {zoom && (
        <div className="tb-lightbox" role="dialog" aria-modal="true" aria-label="Foto" onClick={(e) => e.target === e.currentTarget && setZoom(null)}>
          <button className="tb-lb-close" type="button" aria-label="Tutup" onClick={() => setZoom(null)} autoFocus>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.alt || ''} />
        </div>
      )}
    </div>
  )
}
