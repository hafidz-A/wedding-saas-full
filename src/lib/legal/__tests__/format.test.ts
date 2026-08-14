import { describe, it, expect } from 'vitest'
import { formatRevised } from '../format'

describe('formatRevised', () => {
  it('formats an ISO date in Indonesian (id-ID)', () => {
    expect(formatRevised('2026-06-11T00:00:00.000Z', 'id')).toBe('11 Juni 2026')
  })

  it('formats an ISO date in English (en-GB)', () => {
    expect(formatRevised('2026-06-11T00:00:00.000Z', 'en')).toBe('11 June 2026')
  })

  it('is fixed to Asia/Jakarta — a UTC timestamp just before midnight WIB still reads as the next day', () => {
    // 2026-06-10T17:00:00Z = 2026-06-11T00:00:00+07:00 (Asia/Jakarta)
    expect(formatRevised('2026-06-10T17:00:00.000Z', 'id')).toBe('11 Juni 2026')
    expect(formatRevised('2026-06-10T17:00:00.000Z', 'en')).toBe('11 June 2026')
  })

  it('is fixed to Asia/Jakarta — one second earlier still reads as the prior day', () => {
    expect(formatRevised('2026-06-10T16:59:59.000Z', 'id')).toBe('10 Juni 2026')
  })
})
