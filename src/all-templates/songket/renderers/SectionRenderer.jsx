'use client'

import React, { Suspense, useMemo } from 'react'
import { injectCoupleProps } from '@/lib/meta/couple'

/** Render config.sections through the Songket registry (same contract as the
 *  Lovebirds renderer: skip disabled/unknown, anchor each by its id). */
export default function SectionRenderer({ config, slug, registry }) {
  const sections = useMemo(
    () => (config?.sections || []).filter((s) => s && s.enabled !== false),
    [config],
  )

  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      {sections.map((section) => {
        const Component = registry[section.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[songket] Unknown section type "${section.type}"`)
          }
          return null
        }
        return (
          <div key={section.id} id={section.id} data-section={section.id} data-section-type={section.type}>
            <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
              <Component {...injectCoupleProps(section, config?.couple)} id={section.id} slug={slug} />
            </Suspense>
          </div>
        )
      })}
    </main>
  )
}
