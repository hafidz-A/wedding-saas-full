import { describe, it, expect } from 'vitest'
import { buildSharePayload } from '../sharePayload'

const link = 'https://www.fincards.land/lovebirds/adi-rani?to=Ahmad%20Budi'

describe('buildSharePayload', () => {
  it('moves the personal link into url and tidies the text (default message)', () => {
    const msg = `Halo Ahmad Budi,\n\nDetail lengkap & RSVP di tautan berikut:\n\n${link}\n\nKode RSVP kamu: 449199\n\nTerima kasih 🙏`
    expect(buildSharePayload(msg, link)).toEqual({
      text: 'Halo Ahmad Budi,\n\nDetail lengkap & RSVP di tautan berikut:\n\nKode RSVP kamu: 449199\n\nTerima kasih 🙏',
      url: link,
    })
  })

  it('link inline in a sentence', () => {
    expect(buildSharePayload(`Buka ${link} ya`, link)).toEqual({ text: 'Buka ya', url: link })
  })

  it('a message without the link stays text-only', () => {
    expect(buildSharePayload('Halo, sampai jumpa!', link)).toEqual({ text: 'Halo, sampai jumpa!' })
  })

  it('link used twice is removed both times', () => {
    expect(buildSharePayload(`${link}\n\n${link}`, link)).toEqual({ text: '', url: link })
  })
})
