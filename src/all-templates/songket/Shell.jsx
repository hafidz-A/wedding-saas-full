'use client'

import React, { useEffect, useState } from 'react'
import { sectionRegistry } from './registry.js'
import SectionRenderer from './renderers/SectionRenderer.jsx'
import AmbientOrnaments from './components/AmbientOrnaments.jsx'
import DemoSwitcher from './components/DemoSwitcher.jsx'
import { resolvePalette, resolveOrnament } from './config/theme.js'
import { cinzel } from './config/fonts.js'
import './styles/songket.css'

/**
 * Songket render shell — adat Palembang template (UJI COBA: reachable at
 * /songket/demo-songket, not listed in the catalog or onboarding yet).
 *
 * Palette = `config.theme.defaultPalette`, ornament = `config.theme.ornamentType`
 * (the same fields the owner theme route and the admin appearance dialog write).
 * The palette is mirrored onto <body> so the page background matches the
 * scroll overscroll area.
 */
export default function Shell({ config, slug, isDemo = false, embed = false, embedSwitcher = false }) {
  const [palette, setPalette] = useState(() => resolvePalette(config?.theme?.defaultPalette))
  const [ornament, setOrnament] = useState(() => resolveOrnament(config?.theme?.ornamentType))

  useEffect(() => {
    document.body.classList.add('songket-route')
    return () => {
      document.body.classList.remove('songket-route')
      delete document.body.dataset.skPalette
    }
  }, [])

  useEffect(() => {
    document.body.dataset.skPalette = palette
  }, [palette])

  useEffect(() => {
    if (!embed) return undefined
    document.documentElement.classList.add('embed-scroll')
    return () => document.documentElement.classList.remove('embed-scroll')
  }, [embed])

  // Inside a preview iframe: apply palette/ornament pushed by the parent window
  // (dashboard palette preview, device stage), same message contract as Lovebirds.
  useEffect(() => {
    if (!embed) return undefined
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source === 'fincards-preview' && d?.kind === 'theme') {
        if (d.payload?.theme) setPalette(resolvePalette(d.payload.theme))
        if (d.payload?.ornament) setOrnament(resolveOrnament(d.payload.ornament))
      }
    }
    window.addEventListener('message', onMsg)
    try {
      window.parent?.postMessage({ source: 'fincards-preview', kind: 'ready' }, window.location.origin)
    } catch {}
    return () => window.removeEventListener('message', onMsg)
  }, [embed])

  const showSwitcher = isDemo && (!embed || embedSwitcher)

  return (
    <div className={`songket-root ${cinzel.variable}`} data-sk-palette={palette}>
      <AmbientOrnaments type={ornament} />
      <SectionRenderer config={config} slug={slug} registry={sectionRegistry} />
      {showSwitcher && (
        <DemoSwitcher palette={palette} ornament={ornament} onPalette={setPalette} onOrnament={setOrnament} />
      )}
    </div>
  )
}
