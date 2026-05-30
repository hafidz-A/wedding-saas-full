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
import SectionArrows from './components/SectionArrows.jsx'

import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { AudioProvider } from './contexts/AudioContext.jsx'
import { GuestProvider } from './contexts/GuestContext.jsx'
import { JourneyProvider } from './contexts/JourneyContext.jsx'

import { startSmoothScroll } from './utils/smoothScroll.js'
import { mountGalacticScene } from './three/galacticScene.js'
import { installRhythm } from './utils/rhythm.js'
import { defaultConfig } from './defaultConfig.js'

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
  const config = incoming && incoming.sections ? incoming : defaultConfig

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
  const effSlug = slug || config.meta?.slug || 'demo'
  const sectionIds = visible.map((s) => s.id)

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
    if (lenis?.on) {
      lenis.on('scroll', ScrollTrigger.update)
      setTimeout(() => ScrollTrigger.refresh(), 100)
    }
    installRhythm(config)

    return () => {
      try {
        window.galacticScene?.destroy?.()
      } catch {}
    }
  }, [config])

  return (
    <ThemeProvider
      defaultPalette={config.theme?.defaultPalette}
      options={config.theme?.paletteOptions}
      allowGuestSwitch={isDemo}
    >
      <AudioProvider src={config.audio?.src} defaultVolume={config.audio?.volume ?? 0.5}>
        <GuestProvider>
          <JourneyProvider>
            <FloatingNavbar
              logo={config.meta?.title?.split('—')[0]?.trim() || 'Galactic'}
              allSections={allSections}
            />
            <main>
              {visible.map((s) => (
                <SectionRenderer key={s.id} section={s} slug={effSlug} />
              ))}
            </main>
            <TravellingOverlay />
            {isDemo && <PaletteSwitcher />}
            <MuteButton />
            <SectionArrows sectionIds={sectionIds} />
          </JourneyProvider>
        </GuestProvider>
      </AudioProvider>
    </ThemeProvider>
  )
}
