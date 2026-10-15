import { describe, it, expect } from 'vitest'
import { buildSharePayload } from '../sharePayload'

const link = 'https://www.fincards.land/lovebirds/adi-rani?to=Ahmad%20Budi'

describe('buildSharePayload', () => {
  it('link mid-message (the default message): shared as the exact same text', () => {
    const msg = `Halo Ahmad Budi, dengan tulus kami mengundangmu ke pernikahan kami. Selengkapnya di sini: ${link}\n\nKode RSVP kamu: 449199 (sekali pakai)`
    expect(buildSharePayload(msg, link)).toEqual({ text: msg })
  })

  it('link as the last thing: travels as url, the rest reads identically', () => {
    const msg = `Halo Ahmad Budi,\n\nKode RSVP kamu: 449199\n\nSelengkapnya di sini: ${link}\n`
    expect(buildSharePayload(msg, link)).toEqual({
      text: 'Halo Ahmad Budi,\n\nKode RSVP kamu: 449199\n\nSelengkapnya di sini:',
      url: link,
    })
  })

  it('link on its own last line', () => {
    expect(buildSharePayload(`Halo!\n\n${link}`, link)).toEqual({ text: 'Halo!\n\n', url: link })
  })

  it('a message without the link stays text-only', () => {
    expect(buildSharePayload('Halo, sampai jumpa!', link)).toEqual({ text: 'Halo, sampai jumpa!' })
  })
})
