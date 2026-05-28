'use client'

import { Suspense, useMemo } from 'react'
import { sectionRegistry as lovebirdsRegistry } from '../registry.js'
import { resolveTheme, resolveBackground } from '../config/themes.js'
import SectionSkeleton from '../components/SectionSkeleton.jsx'

/**
 * Render the page from config.sections, using the supplied `registry`
 * (type → component map). Defaults to the Lovebirds registry.
 *
 * For every entry it:
 *   1. Skips if `enabled` is false
 *   2. Skips if `type` isn't in the registry (logs warning in dev)
 *   3. Wraps in a div carrying the resolved theme variables + optional
 *      background override (so each section can theme itself)
 *   4. Suspends until the lazy section component is loaded
 */
export default function SectionRenderer({ config, slug, registry = lovebirdsRegistry }) {
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

        const themeVars = resolveTheme(section.theme)
        const backgroundCss = resolveBackground(section.background)
        const wrapStyle = {
          ...themeVars,
          ...(backgroundCss ? { background: backgroundCss } : null),
        }

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
                {...(section.props || {})}
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
