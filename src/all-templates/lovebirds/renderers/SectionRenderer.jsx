'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { sectionRegistry as lovebirdsRegistry } from '../registry.js'
import { resolveBackground } from '../config/themes.js'
import SectionSkeleton from '../components/SectionSkeleton.jsx'
import { injectCoupleProps } from '@/lib/meta/couple'

// Layer budget. Every section permanently promoted its animated elements with
// `will-change` (measured ~80 compositor layers live at once across the full
// invitation). While ONE section is on screen, the other ~9 sections' layers
// are still composited every frame — cheap-ish on desktop Chrome, but a major
// cost on mobile Safari/iPhone, which handles a large layer tree far worse and
// is where the gate + spring-coil "berat"/jank was reported. (Profiling the
// gate & coil scrolls on emulated mobile ruled out every per-section suspect —
// cards, 3D, blend, geometry — leaving the page-wide layer count as the lever.)
//
// This rule demotes `will-change` to `auto` for any section that is NOT marked
// `data-near` (set by the IntersectionObserver below for sections within ~1.2
// viewports). will-change is a pure compositor hint — overriding it can't change
// layout or behaviour, only which elements hold a GPU layer — so this is safe
// and fully reversible. A section regains its layers ~1.2 viewports before it
// scrolls in, so entrance animations still have them ready.
const LAYER_BUDGET_CSS = `[data-section]:not([data-near]) *{will-change:auto !important}`

/**
 * Render the page from config.sections, using the supplied `registry`
 * (type → component map). Defaults to the Lovebirds registry.
 *
 * For every entry it:
 *   1. Skips if `enabled` is false
 *   2. Skips if `type` isn't in the registry (logs warning in dev)
 *   3. Wraps in a div with an optional per-section background override. The
 *      colour theme is GLOBAL now — applied to <body> by ThemeProvider, so
 *      every section inherits it (legacy per-section `theme:` fields are inert).
 *   4. Suspends until the lazy section component is loaded
 */
export default function SectionRenderer({ config, slug, registry = lovebirdsRegistry }) {
  const sections = useMemo(() => {
    return (config?.sections || []).filter((s) => s && s.enabled !== false)
  }, [config])

  const mainRef = useRef(null)

  // Promote only near-viewport sections (see LAYER_BUDGET_CSS). Start every
  // wrapper "near" (= the old always-promoted behaviour) so a visible section is
  // never briefly demoted before the observer's first callback runs; the
  // observer then demotes the ones that are far away.
  useEffect(() => {
    const main = mainRef.current
    if (!main || typeof IntersectionObserver === 'undefined') return undefined
    const wraps = Array.from(main.querySelectorAll(':scope > [data-section]'))
    if (wraps.length === 0) return undefined
    wraps.forEach((el) => el.setAttribute('data-near', ''))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.setAttribute('data-near', '')
          else entry.target.removeAttribute('data-near')
        }
      },
      { rootMargin: '120% 0px 120% 0px' },
    )
    wraps.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  return (
    <main ref={mainRef} style={{ position: 'relative', zIndex: 1 }}>
      <style dangerouslySetInnerHTML={{ __html: LAYER_BUDGET_CSS }} />
      {sections.map((section) => {
        const Component = registry[section.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[SectionRenderer] Unknown section type "${section.type}"`)
          }
          return null
        }

        const backgroundCss = resolveBackground(section.background)
        const wrapStyle = backgroundCss ? { background: backgroundCss } : undefined

        return (
          <div
            key={section.id}
            id={section.id}                           /* anchor target for FloatingNavbar */
            data-section={section.id}
            data-section-type={section.type}
            data-section-theme={section.theme}
            style={wrapStyle}
          >
            <Suspense fallback={<SectionSkeleton label={section.id} />}>
              <Component
                {...injectCoupleProps(section, config?.couple)}
                id={section.id}
                slug={slug}
                blocks={section.blocks}
                decorativeLayers={section.decorativeLayers}
                layout={section.layout}
              />
            </Suspense>
          </div>
        )
      })}
    </main>
  )
}
