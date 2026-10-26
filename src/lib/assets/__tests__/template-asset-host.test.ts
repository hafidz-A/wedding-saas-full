import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

const ENV = 'NEXT_PUBLIC_STATIC_ASSET_HOST'

/**
 * The templates read the CDN host once, at module-evaluation time, into their
 * `BASE` constant — so the env var has to be in place BEFORE the import, and the
 * module registry has to be reset between cases. Testing this end of the wiring
 * matters more than testing `staticAsset()` alone: the demo pages are the most
 * trafficked public surface on the site, and a broken BASE means every demo
 * photo 404s in production while every unit test still passes.
 */
beforeEach(() => {
  vi.resetModules()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('template demo images honour the static asset host', () => {
  it('Lovebirds serves demo photos from the local path by default', async () => {
    vi.stubEnv(ENV, '')
    const { lovebirdsImg } = await import('@/all-templates/lovebirds/demoImages.js')
    expect(lovebirdsImg('coupleGate')).toBe('/templates/lovebirds/demo/coupleGate.webp')
  })

  it('Lovebirds serves demo photos from R2 when the host is configured', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const { lovebirdsImg } = await import('@/all-templates/lovebirds/demoImages.js')
    expect(lovebirdsImg('coupleGate')).toBe(
      'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
    )
  })

  it('Solary reuses the same Lovebirds asset folder, and follows the same host', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const { solaryImg } = await import('@/all-templates/solary/demoImages.js')
    expect(solaryImg('coupleGate')).toBe(
      'https://media.fincards.land/static/templates/lovebirds/demo/coupleGate.webp',
    )
  })

  it('every Lovebirds slot resolves to a .webp file, never the retired .jpg', async () => {
    vi.stubEnv(ENV, '')
    const { LOVEBIRDS_PHOTOS, lovebirdsImg } = await import(
      '@/all-templates/lovebirds/demoImages.js'
    )
    for (const key of Object.keys(LOVEBIRDS_PHOTOS)) {
      expect(lovebirdsImg(key)).toMatch(/\.webp$/)
    }
  })

  it('Taman Bunga serves every scene layer and demo photo from R2 when the host is configured', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const { SCENE, DEMO_PHOTOS } = await import('@/all-templates/taman-bunga/config/assets.js')
    for (const url of [...Object.values(SCENE), ...Object.values(DEMO_PHOTOS)]) {
      expect(url).toMatch(/^https:\/\/media\.fincards\.land\/static\/templates\/taman-bunga\//)
    }
  })

  it('every Taman Bunga file it references exists in public/ (so the upload carries it)', async () => {
    vi.stubEnv(ENV, '')
    const { existsSync } = await import('node:fs')
    const { SCENE, DEMO_PHOTOS } = await import('@/all-templates/taman-bunga/config/assets.js')
    for (const url of [...Object.values(SCENE), ...Object.values(DEMO_PHOTOS)]) {
      expect(existsSync(`public${url}`), url).toBe(true)
    }
  })
})
