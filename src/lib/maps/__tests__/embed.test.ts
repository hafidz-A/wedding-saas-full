import { describe, it, expect, vi } from 'vitest'
import { normalizeMapEmbed, resolveMapEmbed, resolveConfigMapEmbeds, isMapShortLink } from '../embed'

const EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966!2d106.8!3d-6.19'

describe('normalizeMapEmbed', () => {
  it('keeps a real embed URL', () => {
    expect(normalizeMapEmbed(EMBED)).toBe(EMBED)
  })

  it('extracts src from a pasted <iframe> snippet', () => {
    const html = `<iframe src="${EMBED}&amp;x=1" width="600" height="450" style="border:0;" allowfullscreen=""></iframe>`
    expect(normalizeMapEmbed(html)).toBe(`${EMBED}&x=1`)
  })

  it('uses the exact pin of a place link', () => {
    const url = 'https://www.google.com/maps/place/Gedung+Serbaguna/@-6.2,106.8,17z/data=!3m1!4b1!4m6!3m5!1s0x1:0x2!8m2!3d-6.2012!4d106.8123!16s%2Fg%2F11?entry=ttu'
    expect(normalizeMapEmbed(url)).toBe('https://maps.google.com/maps?q=-6.2012%2C106.8123&z=16&output=embed')
  })

  it('falls back to the place name, then the @ centre', () => {
    expect(normalizeMapEmbed('https://www.google.com/maps/place/Masjid+Istiqlal/@-6.17,106.83,17z'))
      .toBe('https://maps.google.com/maps?q=Masjid%20Istiqlal&z=16&output=embed')
    expect(normalizeMapEmbed('https://www.google.co.id/maps/@-6.17,106.83,17z'))
      .toBe('https://maps.google.com/maps?q=-6.17%2C106.83&z=16&output=embed')
  })

  it('handles ?q= and search links', () => {
    expect(normalizeMapEmbed('https://maps.google.com/?q=Hotel+Mulia')).toContain('q=Hotel%20Mulia')
    expect(normalizeMapEmbed('https://www.google.com/maps/search/?api=1&query=Monas')).toContain('q=Monas')
  })

  it('rejects non-Google hosts, junk, and short links (need resolving)', () => {
    expect(normalizeMapEmbed('https://evil.example/maps/embed?pb=1')).toBe('')
    expect(normalizeMapEmbed('https://google.com.evil.example/maps/embed')).toBe('')
    expect(normalizeMapEmbed('not a url at all')).toBe('')
    expect(normalizeMapEmbed('')).toBe('')
    expect(normalizeMapEmbed(undefined)).toBe('')
    expect(normalizeMapEmbed('https://maps.app.goo.gl/kNgBpNqZoG2ep3246?g_st=ac')).toBe('')
  })
})

function redirects(map: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const loc = map[url]
    return new Response(null, { status: loc ? 302 : 200, headers: loc ? { location: loc } : {} })
  })
}

describe('resolveMapEmbed', () => {
  it('follows a maps.app.goo.gl share link to the pin', async () => {
    const short = 'https://maps.app.goo.gl/kNgBpNqZoG2ep3246?g_st=ac'
    expect(isMapShortLink(short)).toBe(true)
    const f = redirects({
      [short]: 'https://www.google.com/maps/place/Balai+Kartini/@-6.23,106.83,17z/data=!4m6!3m5!8m2!3d-6.2345!4d106.8321?entry=tts',
    })
    expect(await resolveMapEmbed(short, f)).toBe('https://maps.google.com/maps?q=-6.2345%2C106.8321&z=16&output=embed')
  })

  it('follows multiple hops', async () => {
    const short = 'https://maps.app.goo.gl/abc'
    const f = redirects({
      [short]: 'https://maps.google.com/maps?ftid=0x1:0x2',
      'https://maps.google.com/maps?ftid=0x1:0x2': 'https://www.google.com/maps/place/Monas/',
    })
    expect(await resolveMapEmbed(short, f)).toContain('q=Monas')
  })

  it('refuses a redirect off Google and swallows network errors', async () => {
    const short = 'https://maps.app.goo.gl/abc'
    expect(await resolveMapEmbed(short, redirects({ [short]: 'https://evil.example/' }))).toBe('')
    expect(await resolveMapEmbed(short, vi.fn(async () => { throw new Error('offline') }))).toBe('')
  })

  it('never fetches for a non-short link', async () => {
    const f = vi.fn()
    expect(await resolveMapEmbed(EMBED, f)).toBe(EMBED)
    expect(f).not.toHaveBeenCalled()
  })
})

describe('resolveConfigMapEmbeds', () => {
  it('rewrites only sections with a mapEmbed', async () => {
    const cfg = {
      sections: [
        { type: 'hero', props: { coupleName: 'A & B' } },
        { type: 'eventDetails', props: { mapEmbed: 'https://www.google.com/maps/place/Monas/' } },
      ],
    }
    const out = await resolveConfigMapEmbeds(cfg, vi.fn())
    expect(out.sections[0]).toBe(cfg.sections[0])
    expect(out.sections[1].props.mapEmbed).toContain('output=embed')
    expect(cfg.sections[1].props.mapEmbed).toBe('https://www.google.com/maps/place/Monas/')
  })
})
