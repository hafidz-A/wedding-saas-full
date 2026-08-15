import { describe, it, expect } from 'vitest'
import { upgradeLegacyDemoImageUrls } from '../legacy-demo-urls'

/**
 * The bundled demo photos moved from .jpg to .webp on 2026-08-15 and the .jpg
 * originals were deleted. Configs seeded before that date have the old paths
 * baked into the stored JSON — not resolved through demoImages.js — so without
 * this rewrite they request files that no longer exist. That is exactly what
 * shipped to production and 404'd 46 images on a live invitation.
 */
describe('upgradeLegacyDemoImageUrls', () => {
  it('rewrites a legacy demo .jpg path to .webp', () => {
    const cfg = { sections: [{ props: { image: '/templates/lovebirds/demo/coupleGate.jpg' } }] }
    expect(upgradeLegacyDemoImageUrls(cfg)).toEqual({
      sections: [{ props: { image: '/templates/lovebirds/demo/coupleGate.webp' } }],
    })
  })

  it('rewrites the -sm thumbnail variants too', () => {
    const cfg = { a: '/templates/lovebirds/demo/galleryBeach-sm.jpg' }
    expect(upgradeLegacyDemoImageUrls(cfg)).toEqual({
      a: '/templates/lovebirds/demo/galleryBeach-sm.webp',
    })
  })

  it('rewrites inside nested arrays of objects', () => {
    const cfg = {
      sections: [
        { type: 'gallery', props: { photos: [{ src: '/templates/lovebirds/demo/galleryRings.jpg' }] } },
      ],
    }
    const out = upgradeLegacyDemoImageUrls(cfg) as any
    expect(out.sections[0].props.photos[0].src).toBe('/templates/lovebirds/demo/galleryRings.webp')
  })

  it('also handles the absolute CDN form', () => {
    const cfg = { a: 'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.jpg' }
    expect(upgradeLegacyDemoImageUrls(cfg)).toEqual({
      a: 'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
    })
  })

  it('leaves a customer’s own uploaded photo completely alone', () => {
    const url = 'https://media.fincards.land/abc-123/1785638875393-hutan-sungai.png.webp'
    expect(upgradeLegacyDemoImageUrls({ a: url })).toEqual({ a: url })
  })

  it('leaves unrelated .jpg URLs alone — only the bundled demo folder is ours', () => {
    const cfg = { a: 'https://images.unsplash.com/photo-123.jpg', b: '/uploads/mine.jpg' }
    expect(upgradeLegacyDemoImageUrls(cfg)).toEqual(cfg)
  })

  it('is a no-op on an already-migrated config (idempotent)', () => {
    const cfg = { a: '/templates/lovebirds/demo/coupleGate.webp' }
    expect(upgradeLegacyDemoImageUrls(cfg)).toEqual(cfg)
    expect(upgradeLegacyDemoImageUrls(upgradeLegacyDemoImageUrls(cfg))).toEqual(cfg)
  })

  it('survives null, undefined and primitives', () => {
    expect(upgradeLegacyDemoImageUrls(null)).toBeNull()
    expect(upgradeLegacyDemoImageUrls(undefined)).toBeUndefined()
    expect(upgradeLegacyDemoImageUrls(42 as any)).toBe(42)
  })
})
