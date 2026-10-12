'use client'

import { Suspense, lazy, useEffect } from 'react'
import ThemeProvider, { useTheme } from './components/ThemeProvider.jsx'
import GlobalBackground from './components/GlobalBackground.jsx'
import Ornaments from './components/Ornaments.jsx'
import { SongketBorder } from './components/SongketBorder.tsx'
import SectionRenderer from './renderers/SectionRenderer.jsx'
import FloatingNavbar from './components/FloatingNavbar.jsx'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import SmoothScroll from './components/SmoothScroll'
import { sectionRegistry } from './registry.js'
import { DeviceStage } from '@/components/preview/DeviceStage'
import { getDevice } from '@/lib/preview/devicePresets'
import { cinzel } from './config/fonts.js'
import './styles/theme.css'

const MusicPopup = lazy(() => import('./sections/MusicPopup/index.js'))

/**
 * Songket render shell — the adat Palembang template. A FORK of Lovebirds:
 * same cinematic composition, sections, editor contract and behaviour; only
 * the visual layer is adat (palettes, ornaments, songket border, ukiran
 * corners, adat petals, Cinzel headings). UJI COBA: reachable at
 * /songket/demo-songket, not in the catalog or onboarding yet.
 *
 * `embed` = this Shell is rendered inside the device-preview iframe (see
 * DeviceStage). In embed mode we render the invitation plainly (no device
 * frame, no 🎨) and listen for theme messages from the parent window.
 */
export default function Shell({ config, slug, isDemo = false, embed = false, embedSwitcher = false }) {
  const sections = config?.sections || []
  const music = config?.music
  const musicActive = !!music?.url && music.enabled !== false

  // Tag <body> so the Songket theme applies for this route only, and carry
  // the Cinzel variable class there too: theme.css resolves --font-display on
  // <body>, so the font variable must be defined on the same element.
  useEffect(() => {
    document.body.classList.add('songket-route', cinzel.variable)
    return () => document.body.classList.remove('songket-route', cinzel.variable)
  }, [])

  // Embeds (🎨 device bezels + the phone frame) hide the classic desktop
  // scrollbar so the framed page renders exactly like a real phone
  // (see html.embed-scroll in global.css).
  useEffect(() => {
    if (!embed) return undefined
    document.documentElement.classList.add('embed-scroll')
    return () => document.documentElement.classList.remove('embed-scroll')
  }, [embed])

  return (
    <ThemeProvider
      defaultPalette={config?.theme?.defaultPalette}
      defaultOrnament={config?.theme?.ornamentType}
      defaultMotif={config?.theme?.motif}
      defaultKepala={config?.theme?.kepala}
      allowGuestSwitch={isDemo}
    >
      <SongketBody
        config={config}
        slug={slug}
        sections={sections}
        music={music}
        musicActive={musicActive}
        isDemo={isDemo}
        embed={embed}
        embedSwitcher={embedSwitcher}
      />
    </ThemeProvider>
  )
}

/**
 * Lives inside ThemeProvider so it can read the live theme/device. Renders the
 * full invitation, OR — when a non-desktop device is picked in the 🎨 panel —
 * the invitation framed inside a device bezel (iframe) over a themed backdrop.
 */
function SongketBody({ config, slug, sections, music, musicActive, isDemo, embed, embedSwitcher }) {
  const { theme, ornamentType, motif, kepala, device } = useTheme()

  // The cloth motif is pure CSS (styles/theme.css keys off these attributes):
  // data-sk-motif = the badan (body) set, data-sk-kepala = the end-border set,
  // which follows the badan unless a different songket is paired with it.
  useEffect(() => {
    document.body.dataset.skMotif = motif
    document.body.dataset.skKepala = kepala ?? motif
    return () => {
      delete document.body.dataset.skMotif
      delete document.body.dataset.skKepala
    }
  }, [motif, kepala])

  const body = (
    <>
      <SmoothScroll />
      <GlobalBackground />
      <Ornaments />
      <SongketBorder />
      <SectionRenderer config={config} slug={slug} registry={sectionRegistry} />
      <FloatingNavbar sections={sections} />
      {musicActive && (
        <Suspense fallback={null}>
          <MusicPopup
            audioUrl={music.url}
            title={music.title}
            subtitle={music.subtitle}
            acceptLabel={music.acceptLabel}
            dismissLabel={music.dismissLabel}
            loop={music.loop}
          />
        </Suspense>
      )}
    </>
  )

  // Inside the preview iframe: render plainly + bridge theme messages in.
  // Phone-frame embeds of demo pages keep the 🎨 switcher (device picker
  // hidden — a frame inside the frame makes no sense there).
  if (embed) {
    return (
      <>
        {body}
        <EmbedThemeBridge />
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
          {/* Static themed backdrop (palette colour + ornaments) behind the frame. */}
          <GlobalBackground />
          <DeviceStage device={preset} payload={{ theme, ornament: ornamentType, motif, kepala: kepala ?? null }} />
        </>
      ) : (
        body
      )}
      {isDemo && <PaletteSwitcher />}
    </>
  )
}

/**
 * In the preview iframe, apply theme/ornament pushed from the parent 🎨 panel
 * (so switching palette re-themes the framed invitation live). Announces
 * "ready" on mount so the parent sends the current selection immediately.
 */
function EmbedThemeBridge() {
  const { setTheme, setOrnamentType, setMotif, setKepala } = useTheme()
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source === 'fincards-preview' && d?.kind === 'theme') {
        if (d.payload?.theme) setTheme(d.payload.theme)
        if (d.payload?.ornament) setOrnamentType(d.payload.ornament)
        if (d.payload?.motif) setMotif(d.payload.motif)
        if (d.payload && 'kepala' in d.payload) setKepala(d.payload.kepala)
      }
    }
    window.addEventListener('message', onMsg)
    try {
      window.parent?.postMessage({ source: 'fincards-preview', kind: 'ready' }, window.location.origin)
    } catch {}
    return () => window.removeEventListener('message', onMsg)
  }, [setTheme, setOrnamentType, setMotif, setKepala])
  return null
}
