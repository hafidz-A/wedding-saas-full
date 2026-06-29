'use client'

import { Suspense, lazy, useEffect } from 'react'
import ThemeProvider, { useTheme } from './components/ThemeProvider.jsx'
import GlobalBackground from './components/GlobalBackground.jsx'
import Ornaments from './components/Ornaments.jsx'
import { BotanicalBorder } from './components/BotanicalBorder.tsx'
import SectionRenderer from './renderers/SectionRenderer.jsx'
import FloatingNavbar from './components/FloatingNavbar.jsx'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import SmoothScroll from './components/SmoothScroll'
import { sectionRegistry } from './registry.js'
import { DeviceStage } from '@/components/preview/DeviceStage'
import { getDevice } from '@/lib/preview/devicePresets'
import './styles/theme.css'

const MusicPopup = lazy(() => import('./sections/MusicPopup/index.js'))

/**
 * Lovebirds render shell. Boots the cinematic template with a config
 * fetched from Supabase (or the bundled demo). Mirrors the original
 * src/App.jsx + src/pages/Home.jsx composition.
 *
 * `embed` = this Shell is rendered inside the device-preview iframe (see
 * DeviceStage). In embed mode we render the invitation plainly (no device
 * frame, no 🎨) and listen for theme messages from the parent window.
 */
export default function Shell({ config, slug, isDemo = false, embed = false }) {
  const sections = config?.sections || []
  const music = config?.music
  const musicActive = !!music?.url && music.enabled !== false

  // Tag <body> so Lovebirds' cream theme applies for this route only
  // (the shared app global.css carries just resets/tokens now).
  useEffect(() => {
    document.body.classList.add('lovebirds-route')
    return () => document.body.classList.remove('lovebirds-route')
  }, [])

  return (
    <ThemeProvider
      defaultPalette={config?.theme?.defaultPalette}
      defaultOrnament={config?.theme?.ornamentType}
      allowGuestSwitch={isDemo}
    >
      <LovebirdsBody
        config={config}
        slug={slug}
        sections={sections}
        music={music}
        musicActive={musicActive}
        isDemo={isDemo}
        embed={embed}
      />
    </ThemeProvider>
  )
}

/**
 * Lives inside ThemeProvider so it can read the live theme/device. Renders the
 * full invitation, OR — when a non-desktop device is picked in the 🎨 panel —
 * the invitation framed inside a device bezel (iframe) over a themed backdrop.
 */
function LovebirdsBody({ config, slug, sections, music, musicActive, isDemo, embed }) {
  const { theme, ornamentType, device } = useTheme()

  const body = (
    <>
      <SmoothScroll />
      <GlobalBackground />
      <Ornaments />
      <BotanicalBorder />
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
  if (embed) {
    return (
      <>
        {body}
        <EmbedThemeBridge />
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
          <DeviceStage device={preset} payload={{ theme, ornament: ornamentType }} />
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
  const { setTheme, setOrnamentType } = useTheme()
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source === 'fincards-preview' && d?.kind === 'theme') {
        if (d.payload?.theme) setTheme(d.payload.theme)
        if (d.payload?.ornament) setOrnamentType(d.payload.ornament)
      }
    }
    window.addEventListener('message', onMsg)
    try {
      window.parent?.postMessage({ source: 'fincards-preview', kind: 'ready' }, window.location.origin)
    } catch {}
    return () => window.removeEventListener('message', onMsg)
  }, [setTheme, setOrnamentType])
  return null
}
