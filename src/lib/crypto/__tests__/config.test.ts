import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptConfig, decryptConfig } from '../config'

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

/** A config that exercises both template account shapes + global keys. */
function sampleConfig() {
  return {
    meta: { title: 'Aurelia & Hadyan', slug: 'aurelia-hadyan' },
    coupleName: 'Aurelia & Hadyan',
    brideName: 'Aurelia',
    sections: [
      {
        id: 'gift',
        type: 'weddingGift', // lovebirds shape
        props: {
          title: 'Wedding Gift',
          accounts: [
            { id: 'a1', type: 'bank', name: 'BCA', accountNumber: '1234567890', accountHolder: 'Aurelia S.', accent: 'coral' },
          ],
        },
      },
      {
        id: 'giftPlanet',
        type: 'giftPlanet', // solary shape
        props: {
          heading: 'The gift',
          accounts: [{ bank: 'Mandiri', number: '9876543210', name: 'Hadyan P.' }],
        },
      },
      {
        id: 'rsvpPlanet',
        type: 'rsvpPlanet',
        props: { heading: 'RSVP', whatsappNumber: '+62 812-1111-2222' },
      },
      {
        id: 'stay',
        type: 'accommodations',
        props: {
          hotels: [{ id: 'h1', name: 'Kempinski', phone: '+62 21 2358 3838' }], // public — must stay plaintext
        },
      },
    ],
  }
}

describe('encryptConfig / decryptConfig', () => {
  it('round-trips: decrypt(encrypt(x)) deep-equals x', () => {
    const cfg = sampleConfig()
    expect(decryptConfig(encryptConfig(cfg))).toEqual(cfg)
  })

  it('encrypts lovebirds accountNumber + accountHolder, leaves bank name plaintext', () => {
    const enc: any = encryptConfig(sampleConfig())
    const acc = enc.sections[0].props.accounts[0]
    expect(acc.name).toBe('BCA') // bank name stays plaintext
    expect(acc.accountNumber).toHaveProperty('enc')
    expect(acc.accountHolder).toHaveProperty('enc')
    expect(acc.accountNumber.enc).not.toContain('1234567890')
  })

  it('encrypts solary number + name (holder), leaves bank plaintext', () => {
    const enc: any = encryptConfig(sampleConfig())
    const acc = enc.sections[1].props.accounts[0]
    expect(acc.bank).toBe('Mandiri') // bank stays plaintext
    expect(acc.number).toHaveProperty('enc')
    expect(acc.name).toHaveProperty('enc') // holder name encrypted here
  })

  it('encrypts whatsappNumber anywhere in the tree', () => {
    const enc: any = encryptConfig(sampleConfig())
    expect(enc.sections[2].props.whatsappNumber).toHaveProperty('enc')
  })

  it('leaves public accommodation phone numbers plaintext', () => {
    const enc: any = encryptConfig(sampleConfig())
    expect(enc.sections[3].props.hotels[0].phone).toBe('+62 21 2358 3838')
  })

  it('keeps non-sensitive copy (couple name, headings) plaintext', () => {
    const enc: any = encryptConfig(sampleConfig())
    expect(enc.coupleName).toBe('Aurelia & Hadyan')
    expect(enc.brideName).toBe('Aurelia')
    expect(enc.sections[0].props.title).toBe('Wedding Gift')
  })

  it('is idempotent: encrypt(encrypt(x)) === encrypt(x)', () => {
    const once = encryptConfig(sampleConfig())
    const twice = encryptConfig(once)
    expect(twice).toEqual(once)
  })

  it('decrypt is a no-op on a plaintext config', () => {
    const cfg = sampleConfig()
    expect(decryptConfig(cfg)).toEqual(cfg)
  })

  it('does not mutate the input object', () => {
    const cfg = sampleConfig()
    const snapshot = JSON.parse(JSON.stringify(cfg))
    encryptConfig(cfg)
    expect(cfg).toEqual(snapshot)
  })

  it('handles null / empty config', () => {
    expect(encryptConfig(null)).toBeNull()
    expect(decryptConfig(null)).toBeNull()
    expect(encryptConfig({})).toEqual({})
  })
})
