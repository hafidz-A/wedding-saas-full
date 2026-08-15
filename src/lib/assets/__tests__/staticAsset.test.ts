import { describe, it, expect, afterEach, vi } from 'vitest'

const ENV = 'NEXT_PUBLIC_STATIC_ASSET_HOST'

/** The module reads process.env at call time, so a fresh import is not needed. */
async function subject() {
  return await import('../staticAsset.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('staticAsset', () => {
  it('falls back to the local public/ path when no host is configured', async () => {
    vi.stubEnv(ENV, '')
    const { staticAsset } = await subject()
    expect(staticAsset('/templates/lovebirds/demo/coupleGate.webp')).toBe(
      '/templates/lovebirds/demo/coupleGate.webp',
    )
  })

  it('serves from the CDN host under the reserved static/ prefix when set', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const { staticAsset } = await subject()
    expect(staticAsset('/tutorial/solary/editor-list.webp')).toBe(
      'https://media.fincards.land/static/tutorial/solary/editor-list.webp',
    )
  })

  it('tolerates a trailing slash on the configured host', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land///')
    const { staticAsset } = await subject()
    expect(staticAsset('/images/couple_silhouette.webp')).toBe(
      'https://media.fincards.land/static/images/couple_silhouette.webp',
    )
  })

  it('accepts a path with no leading slash', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land')
    const { staticAsset } = await subject()
    expect(staticAsset('images/x.webp')).toBe('https://media.fincards.land/static/images/x.webp')
  })

  it('never emits a double slash between host and prefix', async () => {
    vi.stubEnv(ENV, 'https://media.fincards.land/')
    const { staticAsset } = await subject()
    expect(staticAsset('/a/b.webp')).not.toMatch(/[^:]\/\//)
  })
})
