import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl, renderMessageTemplate } from '../whatsapp'

describe('buildWhatsAppUrl', () => {
  it('builds direct chat URL when phone is provided', () => {
    const url = buildWhatsAppUrl({ phoneE164: '6281234567890', message: 'Halo Agus' })
    expect(url).toBe('https://wa.me/6281234567890?text=Halo%20Agus')
  })

  it('builds share-picker URL when phone is null', () => {
    const url = buildWhatsAppUrl({ phoneE164: null, message: 'Halo Agus' })
    expect(url).toBe('https://wa.me/?text=Halo%20Agus')
  })

  it('encodes newlines and special chars in the message', () => {
    const url = buildWhatsAppUrl({ phoneE164: null, message: 'Halo!\nLink: https://x.com' })
    expect(url).toContain('Halo!%0ALink')
    expect(url).toContain('https%3A%2F%2Fx.com')
  })
})

describe('renderMessageTemplate', () => {
  it('replaces {{name}} placeholder', () => {
    expect(renderMessageTemplate('Halo {{name}}', { name: 'Agus', url: '', token: '' }))
      .toBe('Halo Agus')
  })
  it('replaces {{url}} placeholder', () => {
    expect(renderMessageTemplate('Buka {{url}}', { name: '', url: 'https://w.id/agus', token: '' }))
      .toBe('Buka https://w.id/agus')
  })
  it('accepts Indonesian alias {{nama}}', () => {
    expect(renderMessageTemplate('Halo {{nama}}', { name: 'Agus', url: '', token: '' }))
      .toBe('Halo Agus')
  })
  it('accepts Indonesian alias {{link}}', () => {
    expect(renderMessageTemplate('Klik {{link}}', { name: '', url: 'https://w.id/x', token: '' }))
      .toBe('Klik https://w.id/x')
  })
  it('tolerates whitespace inside braces', () => {
    expect(renderMessageTemplate('Halo {{ nama }}', { name: 'Agus', url: '', token: '' }))
      .toBe('Halo Agus')
  })
  it('leaves unknown placeholders intact', () => {
    expect(renderMessageTemplate('Halo {{nickname}}', { name: 'A', url: '', token: '' }))
      .toBe('Halo {{nickname}}')
  })
})

const vars = { name: 'Budi', url: 'https://x.test/a', token: '428913' }

describe('renderMessageTemplate token', () => {
  it('replaces {{token}} and {{kode}} (case-insensitive)', () => {
    expect(renderMessageTemplate('Hi {{name}}, kode {{token}}', vars)).toBe('Hi Budi, kode 428913')
    expect(renderMessageTemplate('Kode: {{ KODE }}', vars)).toBe('Kode: 428913')
  })
  it('still replaces name and url', () => {
    expect(renderMessageTemplate('{{nama}} {{link}} {{kode}}', vars)).toBe('Budi https://x.test/a 428913')
  })
})
