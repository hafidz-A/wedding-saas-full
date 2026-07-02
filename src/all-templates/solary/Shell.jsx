'use client'

import { useEffect, useMemo } from 'react'

import './styles/tokens.css'
import './styles/themes.css'
import './styles/globals.css'
import './styles/utilities.css'
import './styles/components.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import SectionRenderer from './renderers/SectionRenderer.jsx'
import FloatingNavbar from './components/FloatingNavbar.jsx'
import TravellingOverlay from './components/TravellingOverlay.jsx'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import MuteButton from './components/MuteButton.jsx'
import MusicPopup from './components/MusicPopup.jsx'
import SectionArrows from './components/SectionArrows.jsx'

import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx'
import { AudioProvider } from './contexts/AudioContext.jsx'
import { GuestProvider } from './contexts/GuestContext.jsx'
import { JourneyProvider } from './contexts/JourneyContext.jsx'

import { navName } from '@/lib/meta/couple'

import { startSmoothScroll, stopSmoothScroll } from './utils/smoothScroll.js'
import { mountGalacticScene } from './three/galacticScene.js'
import { installRhythm } from './utils/rhythm.js'
import { defaultConfig } from './defaultConfig.js'
import { normalizeSolaryConfig } from './config/normalizeConfig.js'
import { resolveMusicSource } from '@/lib/music/source'

import { DeviceStage } from '@/components/preview/DeviceStage'
import { AndromedaBackdrop } from '@/components/preview/AndromedaBackdrop'
import { getDevice } from '@/lib/preview/devicePresets'

/**
 * Solary render shell — port of the standalone galactic-wedding
 * InvitationPage + main.jsx boot sequence.
 *
 * The 3D scene, Lenis smooth scroll, and section "rhythm" all run
 * outside React (in <SolaryScene>) for performance. This module is
 * dynamic-imported with `ssr: false`, so Three.js / window access never
 * runs on the server.
 *
 * `embed` = rendered inside the device-preview iframe (demo 🎨 "Tampilan"):
 * plain invitation, no device frame / 🎨, listens for theme messages.
 */
export default function Shell({ config: incoming, slug, isDemo = false, embed = false, embedSwitcher = false }) {
  const raw = incoming && incoming.sections ? incoming : defaultConfig
  const config = useMemo(() => normalizeSolaryConfig(raw), [raw])

  // Tag <body> so Solary's dark cosmic background overrides the app's shared
  // cream body background for this route only. Removed on unmount.
  useEffect(() => {
    document.body.classList.add('solary-route')
    return () => document.body.classList.remove('solary-route')
  }, [])

  return (
    <ThemeProvider
      defaultPalette={config.theme?.defaultPalette}
      options={config.theme?.paletteOptions}
      allowGuestSwitch={isDemo}
    >
      <AudioProvider src={resolveAudioSrc(config)} defaultVolume={config.audio?.volume ?? 0.5}>
        <GuestProvider>
          <JourneyProvider>
            <SolaryBody config={config} slug={slug} isDemo={isDemo} embed={embed} embedSwitcher={embedSwitcher} />
          </JourneyProvider>
        </GuestProvider>
      </AudioProvider>
    </ThemeProvider>
  )
}

function resolveAudioSrc(config) {
  const music = config.music || {}
  return music.enabled === false
    ? null
    : (resolveMusicSource(music)?.kind === 'audio' ? resolveMusicSource(music).url : null) ||
        config.audio?.src ||
        null
}

/**
 * Inside the providers: reads the live palette/device. Renders the full
 * cinematic invitation, OR — when a non-desktop device is chosen — the
 * invitation framed in a device bezel (iframe) over a static cosmic backdrop.
 */
function SolaryBody({ config, slug, isDemo, embed, embedSwitcher }) {
  const { palette, device, tokens } = useTheme()

  const visible = useMemo(
    () => (config.sections || []).filter((s) => s.enabled !== false),
    [config],
  )
  const allSections = useMemo(
    () =>
      visible.map((s) => ({
        id: s.id,
        planetKey: s.props?.planetKey || s.planet?.key || null,
        planetName: s.props?.planetName || s.planet?.name || s.id,
        navLabel: s.navLabel || s.id,
        navHidden: !!s.navHidden,
      })),
    [visible],
  )
  const music = config.music || {}
  const effSlug = slug || config.meta?.slug || 'demo'
  const gatePhotos = useMemo(() => {
    const gate = (config.sections || []).find((s) => s.type === 'openingGate')
    const photos = gate?.props?.gatePhotos
    return Array.isArray(photos) ? photos.filter(Boolean) : []
  }, [config])

  const body = (
    <>
      <SolaryScene config={config} />
      <FloatingNavbar logo={navName(config, 'Wedding')} allSections={allSections} />
      <main>
        {visible.map((s) => (
          <SectionRenderer key={s.id} section={s} slug={effSlug} gatePhotos={gatePhotos} couple={config.couple} />
        ))}
      </main>
      <TravellingOverlay />
      <MuteButton />
      <MusicPopup
        title={music.title}
        subtitle={music.subtitle}
        acceptLabel={music.acceptLabel}
        dismissLabel={music.dismissLabel}
      />
      <SectionArrows allSections={allSections} />
    </>
  )

  if (embed) {
    return (
      <>
        {body}
        <SolaryEmbedBridge />
        {/* Phone-frame embeds of demo pages keep the 🎨 (device picker hidden). */}
        {isDemo && embedSwitcher && <PaletteSwitcher hideDevices />}
      </>
    )
  }

  const preset = getDevice(device)
  const framed = preset.kind !== 'desktop'

  return (
    <>
      {framed ? (
        <>
          <SolaryStaticBackdrop tokens={tokens} />
          <DeviceStage device={preset} payload={{ palette }} />
        </>
      ) : (
        body
      )}
      {isDemo && <PaletteSwitcher />}
    </>
  )
}

/**
 * Boots the Three.js scene + Lenis smooth scroll + section rhythm. Lives in its
 * own component so toggling to a device frame unmounts it (scene destroyed),
 * and toggling back remounts it (scene re-booted) — keeping the outer device
 * preview lightweight.
 */
function SolaryScene({ config }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (config.scene?.enabled !== false) {
      mountGalacticScene({ starfieldDensity: config.scene?.starfieldDensity })
    }
    const lenis = startSmoothScroll(config.scene?.lenis)
    let refreshTimer = 0
    if (lenis?.on) {
      lenis.on('scroll', ScrollTrigger.update)
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 100)
    }
    const uninstallRhythm = installRhythm(config)

    return () => {
      clearTimeout(refreshTimer)
      try { uninstallRhythm?.() } catch {}
      try { lenis?.off?.('scroll', ScrollTrigger.update) } catch {}
      try { stopSmoothScroll() } catch {}
      try { window.galacticScene?.destroy?.() } catch {}
    }
  }, [config])
  return null
}

/**
 * Static themed backdrop behind the device frame: the palette base colour with
 * Solary's Andromeda galaxy + starfield (so it's never an empty void), tinted
 * to the active palette.
 */
function SolaryStaticBackdrop({ tokens }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(circle at 50% 30%, var(--color-bg-soft, #1a1330), var(--color-bg, #0b0a12) 75%)',
      }}
    >
      <AndromedaBackdrop
        accent={tokens?.accent || '#c19bff'}
        sun={tokens?.sun || tokens?.glow || '#f5c518'}
        fg={tokens?.fg || '#ece5f6'}
        dark={tokens?.mode !== 'light'}
      />
    </div>
  )
}

/**
 * In the preview iframe, apply the palette pushed from the parent 🎨 panel.
 * Announces "ready" on mount so the parent sends the current palette.
 */
function SolaryEmbedBridge() {
  const { setPalette } = useTheme()
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source === 'fincards-preview' && d?.kind === 'theme' && d.payload?.palette) {
        setPalette(d.payload.palette)
      }
    }
    window.addEventListener('message', onMsg)
    try {
      window.parent?.postMessage({ source: 'fincards-preview', kind: 'ready' }, window.location.origin)
    } catch {}
    return () => window.removeEventListener('message', onMsg)
  }, [setPalette])
  return null
}
