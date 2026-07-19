import { describe, it, expect } from 'vitest'
import { parsePaymentSettings } from '../payment-settings'

describe('parsePaymentSettings', () => {
  it('reads a valid manual row', () => {
    expect(parsePaymentSettings({ mode: 'manual', whatsapp: '628', email: 'a@b.com' }))
      .toEqual({ mode: 'manual', whatsapp: '628', email: 'a@b.com' })
  })
  it('defaults to gateway when missing/invalid', () => {
    expect(parsePaymentSettings(null)).toEqual({ mode: 'gateway', whatsapp: '', email: '' })
    expect(parsePaymentSettings({ mode: 'nonsense' }))
      .toEqual({ mode: 'gateway', whatsapp: '', email: '' })
  })
})
