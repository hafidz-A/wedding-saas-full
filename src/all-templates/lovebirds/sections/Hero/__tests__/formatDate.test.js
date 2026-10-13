import { describe, it, expect } from 'vitest'
import { formatDate } from '../Hero.jsx'

describe('Hero formatDate', () => {
  // Midday local time so the calendar day can't shift with the test runner's TZ.
  const iso = '2026-12-20T12:00:00'

  it('English stays the default (existing invitations unchanged)', () => {
    expect(formatDate(iso)).toBe('Sunday, December 20, 2026')
    expect(formatDate(iso, 'en')).toBe('Sunday, December 20, 2026')
  })

  it('Indonesian', () => {
    expect(formatDate(iso, 'id')).toBe('Minggu, 20 Desember 2026')
  })

  it('unknown language falls back to English; bad input is passed through', () => {
    expect(formatDate(iso, 'xx')).toBe('Sunday, December 20, 2026')
    expect(formatDate('')).toBe('')
    expect(formatDate('bukan tanggal', 'id')).toBe('bukan tanggal')
  })
})
