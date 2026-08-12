import { describe, it, expect } from 'vitest'
import { referencedMediaKeys } from '../referenced-keys.mjs'

const R2 = 'https://media.fincards.land'
const SB = 'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/invitation-media'

describe('referencedMediaKeys', () => {
  it('collects keys from both hosts, nested anywhere', () => {
    const config = {
      sections: [
        { type: 'hero', props: { image: `${R2}/inv-1/hero.webp` } },
        { type: 'gallery', props: { images: [`${SB}/inv-1/g1.webp`, 'https://picsum.photos/1'] } },
      ],
      music: { url: `${R2}/inv-1/lagu.mp3` },
    }
    expect(referencedMediaKeys(config)).toEqual(
      new Set(['inv-1/hero.webp', 'inv-1/g1.webp', 'inv-1/lagu.mp3']),
    )
  })

  it('ignores foreign hosts and non-strings', () => {
    const config = { a: 'https://images.unsplash.com/photo-1', b: 42, c: null, d: '/local/x.jpg' }
    expect(referencedMediaKeys(config)).toEqual(new Set())
  })

  it('strips a query string — the stored URL may carry one, the key never does', () => {
    expect(referencedMediaKeys({ a: `${R2}/inv-1/hero.webp?v=2` })).toEqual(new Set(['inv-1/hero.webp']))
  })

  it('handles null and empty configs', () => {
    expect(referencedMediaKeys(null)).toEqual(new Set())
    expect(referencedMediaKeys({})).toEqual(new Set())
  })
})
