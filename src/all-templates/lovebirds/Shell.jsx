'use client'

import { Suspense, lazy, useEffect } from 'react'
import ThemeProvider from './components/ThemeProvider.jsx'
import GlobalBackground from './components/GlobalBackground.jsx'
import { BotanicalBorder } from './components/BotanicalBorder.tsx'
import SectionRenderer from './renderers/SectionRenderer.jsx'
import FloatingNavbar from './components/FloatingNavbar.jsx'
import SmoothScroll from './components/SmoothScroll'
import { sectionRegistry } from './registry.js'
import './styles/theme.css'

const MusicPopup = lazy(() => import('./sections/MusicPopup/index.js'))

/**
 * Lovebirds render shell. Boots the cinematic template with a config
 * fetched from Supabase (or the bundled demo). Mirrors the original
 * src/App.jsx + src/pages/Home.jsx composition.
 */
export default function Shell({ config, slug }) {
  const sections = config?.sections || []
  const music = config?.music
  const musicActive = music?.url && music.enabled !== false
  const bgGif = config?.bgGif

  // Tag <body> so Lovebirds' cream theme applies for this route only
  // (the shared app global.css carries just resets/tokens now).
  useEffect(() => {
    document.body.classList.add('lovebirds-route')
    return () => document.body.classList.remove('lovebirds-route')
  }, [])

  return (
    <ThemeProvider theme={undefined}>
      <SmoothScroll />
      <GlobalBackground gifUrl={bgGif} />
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
    </ThemeProvider>
  )
}
