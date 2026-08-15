import { describe, it, expect, afterEach, vi } from 'vitest'
import { upgradeLegacyDemoImageUrls } from '../legacy-demo-urls'

const ENV = 'NEXT_PUBLIC_STATIC_ASSET_HOST'

afterEach(() => {
  vi.unstubAllEnvs()
})

/**
 * Stored configs name the bundled demo photos as a resolved, absolute-ish
 * string. That means BOTH halves of the URL go stale independently: the
 * extension (the .jpg -> .webp re-encode) and the host (public/ -> R2). A real
 * invitation kept serving 21 images off Vercel after the R2 switch because only
 * the extension was being repointed.
 */
describe('upgradeLegacyDemoImageUrls — host normalisation', () => {
  it('repoints a stored local demo path at R2 when a host is configured', () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    expect(upgradeLegacyDemoImageUrls({ a: '/templates/lovebirds/demo/coupleGate.webp' })).toEqual({
      a: 'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
    })
  })

  it('repoints a stale .jpg and the host in one pass', () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    expect(upgradeLegacyDemoImageUrls({ a: '/templates/lovebirds/demo/storyHoliday.jpg' })).toEqual({
      a: 'https://media.fincards.land/static/templates/lovebirds/demo/storyHoliday.webp',
    })
  })

  it('brings stored R2 URLs BACK to local paths when the host is unset (clean rollback)', () => {
    vi.stubEnv(ENV, '')
    expect(
      upgradeLegacyDemoImageUrls({
        a: 'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
      }),
    ).toEqual({ a: '/templates/lovebirds/demo/coupleGate.webp' })
  })

  it('follows a CHANGED host rather than pinning the old one', () => {
    vi.stubEnv(ENV, 'https://cdn2.example.com')
    expect(
      upgradeLegacyDemoImageUrls({
        a: 'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
      }),
    ).toEqual({ a: 'https://cdn2.example.com/static/templates/lovebirds/demo/coupleGate.webp' })
  })

  it('still never touches a customer’s own uploaded photo', () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const url = 'https://media.fincards.land/abc-123/1785638875393-hutan-sungai.png.webp'
    expect(upgradeLegacyDemoImageUrls({ a: url })).toEqual({ a: url })
  })
})

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

  it('also handles the absolute CDN form, keeping the host when it is the configured one', () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
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
