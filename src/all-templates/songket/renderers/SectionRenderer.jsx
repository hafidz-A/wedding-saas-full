'use client'

import { Suspense, useMemo } from 'react'
import { sectionRegistry as songketRegistry } from '../registry.js'
import { resolveBackground } from '../config/themes.js'
import SectionSkeleton from '../components/SectionSkeleton.jsx'
import { injectCoupleProps } from '@/lib/meta/couple'

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
const SEAM_STYLE = { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 }

export default function SectionRenderer({ config, slug, registry = songketRegistry }) {
  const sections = useMemo(() => {
    return (config?.sections || []).filter((s) => s && s.enabled !== false)
  }, [config])

  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      {sections.map((section) => {
        const Component = registry[section.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[SectionRenderer] Unknown section type "${section.type}"`)
          }
          return null
        }

        const backgroundCss = resolveBackground(section.background)
        const wrapStyle = { position: 'relative', ...(backgroundCss ? { background: backgroundCss } : null) }
        // Songket: every section after the hero opens with a kepala kain border
        // hanging from its top edge — the seam between two "cloths". Skipped on
        // the hero (it frames itself) and on the pinned Spring Coil gallery.
        const seam = section.type !== 'hero' && section.type !== 'gallerySpringCoil'

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
            {seam && <div className="sk-kepala-kain" style={SEAM_STYLE} aria-hidden="true" />}
          </div>
        )
      })}
    </main>
  )
}
