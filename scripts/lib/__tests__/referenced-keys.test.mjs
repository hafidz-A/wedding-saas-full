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
    expect(referencedMediaKeys(config, R2)).toEqual(
      new Set(['inv-1/hero.webp', 'inv-1/g1.webp', 'inv-1/lagu.mp3']),
    )
  })

  it('ignores foreign hosts and non-strings', () => {
    const config = { a: 'https://images.unsplash.com/photo-1', b: 42, c: null, d: '/local/x.jpg' }
    expect(referencedMediaKeys(config, R2)).toEqual(new Set())
  })

  it('strips a query string — the stored URL may carry one, the key never does', () => {
    expect(referencedMediaKeys({ a: `${R2}/inv-1/hero.webp?v=2` }, R2)).toEqual(new Set(['inv-1/hero.webp']))
  })

  it('handles null and empty configs', () => {
    expect(referencedMediaKeys(null, R2)).toEqual(new Set())
    expect(referencedMediaKeys({}, R2)).toEqual(new Set())
  })

  it('does not collect R2 URLs on a DIFFERENT host than the one passed in', () => {
    // This is the bug being fixed: a hardcoded host would have matched
    // media.fincards.land regardless of what the caller's environment
    // actually resolves R2_PUBLIC_HOST to.
    const config = {
      a: `${R2}/inv-1/hero.webp`,
      b: `${SB}/inv-1/g1.webp`,
    }
    expect(referencedMediaKeys(config, 'https://staging-media.example.com')).toEqual(
      new Set(['inv-1/g1.webp']),
    )
  })

  it('with publicHost omitted or empty, still collects Supabase URLs but not R2 URLs', () => {
    const config = {
      a: `${R2}/inv-1/hero.webp`,
      b: `${SB}/inv-1/g1.webp`,
    }
    expect(referencedMediaKeys(config)).toEqual(new Set(['inv-1/g1.webp']))
    expect(referencedMediaKeys(config, '')).toEqual(new Set(['inv-1/g1.webp']))
    expect(referencedMediaKeys(config, null)).toEqual(new Set(['inv-1/g1.webp']))
  })
})
