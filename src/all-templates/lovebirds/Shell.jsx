'use client'

import { Suspense, lazy, useEffect } from 'react'
import ThemeProvider from './components/ThemeProvider.jsx'
import GlobalBackground from './components/GlobalBackground.jsx'
import Ornaments from './components/Ornaments.jsx'
import { BotanicalBorder } from './components/BotanicalBorder.tsx'
import SectionRenderer from './renderers/SectionRenderer.jsx'
import FloatingNavbar from './components/FloatingNavbar.jsx'
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
import SmoothScroll from './components/SmoothScroll'
import { sectionRegistry } from './registry.js'
import './styles/theme.css'

const MusicPopup = lazy(() => import('./sections/MusicPopup/index.js'))

/**
 * Lovebirds render shell. Boots the cinematic template with a config
 * fetched from Supabase (or the bundled demo). Mirrors the original
 * src/App.jsx + src/pages/Home.jsx composition.
 */
export default function Shell({ config, slug, isDemo = false }) {
  const sections = config?.sections || []
  const music = config?.music
  const musicActive = (music?.url || music?.youtubeId) && music.enabled !== false

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
      <SmoothScroll />
      <GlobalBackground />
      {/* Ornaments reads the live palette + ornament type from ThemeProvider,
          so demo switches re-colour the canvas birds and swap the shape. */}
      <Ornaments />
      <BotanicalBorder />
      <SectionRenderer config={config} slug={slug} registry={sectionRegistry} />
      <FloatingNavbar sections={sections} />
      {musicActive && (
        <Suspense fallback={null}>
          <MusicPopup
            audioUrl={music.url}
            youtubeId={music.youtubeId}
            title={music.title}
            subtitle={music.subtitle}
            acceptLabel={music.acceptLabel}
            dismissLabel={music.dismissLabel}
            loop={music.loop}
          />
        </Suspense>
      )}
      {isDemo && <PaletteSwitcher />}
    </ThemeProvider>
  )
}
