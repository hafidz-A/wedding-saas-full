import { describe, it, expect } from 'vitest'
import { CONSENT_VERSION } from '../consent'

describe('CONSENT_VERSION', () => {
  it('is a YYYY-MM-DD string (stamped into user metadata at signup)', () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is a real, parseable calendar date', () => {
    const ts = Date.parse(CONSENT_VERSION)
    expect(Number.isNaN(ts)).toBe(false)
  })
})
