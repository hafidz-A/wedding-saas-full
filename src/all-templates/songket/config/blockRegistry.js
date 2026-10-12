import { lazy } from 'react'

/* Primitive block registry — type → lazy component. Add new blocks here + reference from config. */

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
