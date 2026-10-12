'use client'

import { Suspense } from 'react'
import { blockRegistry } from '../config/blockRegistry.js'

/**
 * Render a list of blocks dynamically based on the `type` field.
 * Unknown / missing types are silently skipped (logged in dev).
 *
 * Usage from any section:
 *   <BlockRenderer blocks={section.blocks} />
 */
export default function BlockRenderer({ blocks }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <>
      {blocks.map((block, idx) => {
        const Component = blockRegistry[block.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[BlockRenderer] Unknown block type "${block.type}"`)
          }
          return null
        }
        return (
          <Suspense key={block.id ?? `${block.type}-${idx}`} fallback={null}>
            <Component {...block} />
          </Suspense>
        )
      })}
    </>
  )
}
