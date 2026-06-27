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

import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { AudioProvider } from './contexts/AudioContext.jsx'
import { GuestProvider } from './contexts/GuestContext.jsx'
import { JourneyProvider } from './contexts/JourneyContext.jsx'

import { startSmoothScroll, stopSmoothScroll } from './utils/smoothScroll.js'
import { mountGalacticScene } from './three/galacticScene.js'
import { installRhythm } from './utils/rhythm.js'
import { defaultConfig } from './defaultConfig.js'
import { normalizeSolaryConfig } from './config/normalizeConfig.js'
import { clearPaletteFromDOM } from './config/themeTokens.js'
import { resolveMusicSource } from '@/lib/music/source'

/**
 * Solary render shell — port of the standalone galactic-wedding
 * InvitationPage + main.jsx boot sequence.
 *
 * The 3D scene, Lenis smooth scroll, and section "rhythm" all run
 * outside React (in this client effect) for performance. This module
 * is dynamic-imported with `ssr: false`, so Three.js / window access
 * never runs on the server.
 */
export default function Shell({ config: incoming, slug, isDemo = false }) {
  const raw = incoming && incoming.sections ? incoming : defaultConfig
  // Normalize so the scene is adaptive to ANY arrangement: self-heal stale
  // sectionLabels left over from type swaps and guarantee every section has a
  // planet for the camera to frame (added sections otherwise have none).
  const config = useMemo(() => normalizeSolaryConfig(raw), [raw])

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
  // music.enabled === false means the couple turned music OFF — do not fall
  // back to the legacy default track. The legacy fallback only applies to
  // configs that predate the music object (enabled undefined).
  const audioSrc =
    music.enabled === false
      ? null
      : (resolveMusicSource(music)?.kind === 'audio' ? resolveMusicSource(music).url : null) ||
        config.audio?.src ||
        null

  const effSlug = slug || config.meta?.slug || 'demo'
  // Gate photos double as the floating "photo-stars" scattered behind every
  // non-photo section (see SectionRenderer's PHOTO_BACKED_TYPES).
  const gatePhotos = useMemo(() => {
    const gate = (config.sections || []).find((s) => s.type === 'openingGate')
    const photos = gate?.props?.gatePhotos
    return Array.isArray(photos) ? photos.filter(Boolean) : []
  }, [config])

  // Tag <body> so Solary's dark cosmic background overrides the app's shared
  // cream body background (root layout + global.css) for this route only.
  // Removed on unmount so other templates keep their own background.
  useEffect(() => {
    document.body.classList.add('solary-route')
    return () => document.body.classList.remove('solary-route')
  }, [])

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
      try { clearPaletteFromDOM() } catch {}
    }
  }, [config])

  return (
    <ThemeProvider
      defaultPalette={config.theme?.defaultPalette}
      options={config.theme?.paletteOptions}
      allowGuestSwitch={isDemo}
    >
      <AudioProvider src={audioSrc} defaultVolume={config.audio?.volume ?? 0.5}>
        <GuestProvider>
          <JourneyProvider>
            <FloatingNavbar
              logo={config.meta?.title?.split('—')[0]?.trim() || 'Wedding'}
              allSections={allSections}
            />
            <main>
              {visible.map((s) => (
                <SectionRenderer key={s.id} section={s} slug={effSlug} gatePhotos={gatePhotos} />
              ))}
            </main>
            <TravellingOverlay />
            {isDemo && <PaletteSwitcher />}
            <MuteButton />
            <MusicPopup
              title={music.title}
              subtitle={music.subtitle}
              acceptLabel={music.acceptLabel}
              dismissLabel={music.dismissLabel}
            />
            <SectionArrows allSections={allSections} />
          </JourneyProvider>
        </GuestProvider>
      </AudioProvider>
    </ThemeProvider>
  )
}
