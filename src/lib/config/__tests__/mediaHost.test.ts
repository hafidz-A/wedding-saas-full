import { describe, it, expect } from 'vitest'
import { rewriteMediaHost, rewriteConfigMediaHosts } from '../mediaHost'

const HOST = 'https://media.fincards.land'
const SB = 'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/invitation-media'

describe('rewriteMediaHost', () => {
  it('rewrites a Supabase public media URL onto the new host', () => {
    expect(rewriteMediaHost(`${SB}/inv-1/123-foto.webp`, HOST)).toBe(`${HOST}/inv-1/123-foto.webp`)
  })

  it('is an identity when no host is supplied — this is the kill switch', () => {
    const u = `${SB}/inv-1/123-foto.webp`
    expect(rewriteMediaHost(u, null)).toBe(u)
    expect(rewriteMediaHost(u, undefined)).toBe(u)
    expect(rewriteMediaHost(u, '')).toBe(u)
  })

  it('leaves foreign hosts alone', () => {
    for (const u of [
      'https://images.unsplash.com/photo-123',
      'https://picsum.photos/800',
      '/templates/lovebirds/demo/hero.jpg',
      'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/other-bucket/x.png',
    ]) {
      expect(rewriteMediaHost(u, HOST)).toBe(u)
    }
  })

  it('tolerates non-strings and empty values', () => {
    expect(rewriteMediaHost(null, HOST)).toBe(null)
    expect(rewriteMediaHost(undefined, HOST)).toBe(undefined)
    expect(rewriteMediaHost(42, HOST)).toBe(42)
    expect(rewriteMediaHost('', HOST)).toBe('')
  })

  it('does not produce a double slash when the host has a trailing slash', () => {
    expect(rewriteMediaHost(`${SB}/inv-1/a.webp`, `${HOST}/`)).toBe(`${HOST}/inv-1/a.webp`)
  })

  it('leaves a bare bucket URL with no key alone', () => {
    expect(rewriteMediaHost(`${SB}/`, HOST)).toBe(`${SB}/`)
  })
})

describe('rewriteConfigMediaHosts', () => {
  it('rewrites strings nested in objects and arrays', () => {
    const config = {
      sections: [
        { type: 'hero', props: { image: `${SB}/inv-1/hero.webp`, title: 'Adi & Rani' } },
        { type: 'gallery', props: { images: [`${SB}/inv-1/g1.webp`, 'https://picsum.photos/1'] } },
      ],
      music: { url: `${SB}/inv-1/lagu.mp3` },
    }
    const out: any = rewriteConfigMediaHosts(config, HOST)
    expect(out.sections[0].props.image).toBe(`${HOST}/inv-1/hero.webp`)
    expect(out.sections[0].props.title).toBe('Adi & Rani')
    expect(out.sections[1].props.images[0]).toBe(`${HOST}/inv-1/g1.webp`)
    expect(out.sections[1].props.images[1]).toBe('https://picsum.photos/1')
    expect(out.music.url).toBe(`${HOST}/inv-1/lagu.mp3`)
  })

  it('returns the config untouched when no host is supplied', () => {
    const config = { a: `${SB}/inv-1/x.webp` }
    expect(rewriteConfigMediaHosts(config, null)).toBe(config)
  })

  it('handles null config', () => {
    expect(rewriteConfigMediaHosts(null, HOST)).toBe(null)
  })
})
