import { lazy } from 'react'

/* ============================================================================
   BLOCK REGISTRY

   Primitive content blocks that compose section content. Used by
   BlockRenderer for any section that has a `blocks: [...]` array.

   Adding a new block:
     1. Create src/blocks/<Name>Block.jsx
     2. Register here as `<type>: lazy(() => import('...'))`
     3. Reference from pageConfig.js: `{ type: '<type>', ... }`
   ============================================================================ */

export const blockRegistry = {
  text:             lazy(() => import('../blocks/TextBlock.jsx')),
  image:            lazy(() => import('../blocks/ImageBlock.jsx')),
  quote:            lazy(() => import('../blocks/QuoteBlock.jsx')),
  video:            lazy(() => import('../blocks/VideoBlock.jsx')),
  masonryGallery:   lazy(() => import('../blocks/MasonryGalleryBlock.jsx')),
  ctaButton:        lazy(() => import('../blocks/CTAButtonBlock.jsx')),
  spacer:           lazy(() => import('../blocks/SpacerBlock.jsx')),
  floralLayer:      lazy(() => import('../blocks/FloralLayerBlock.jsx')),
  decorativeLayer:  lazy(() => import('../blocks/DecorativeLayerBlock.jsx')),
}

export default blockRegistry
