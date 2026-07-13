import { describe, it, expect } from 'vitest'
import { buildGuestLink } from '../guestLink'

describe('buildGuestLink', () => {
  it('appends ?to= on a bare URL', () => {
    expect(buildGuestLink('https://x.test/lovebirds/rani', 'Ahmad')).toBe(
      'https://x.test/lovebirds/rani?to=Ahmad',
    )
  })

  it('uses & when the URL already has a query string', () => {
    expect(buildGuestLink('https://x.test/a?utm=wa', 'Ahmad')).toBe('https://x.test/a?utm=wa&to=Ahmad')
  })

  it('encodes spaces and honorifics', () => {
    expect(buildGuestLink('https://x.test/a', 'Pak Ahmad')).toBe('https://x.test/a?to=Pak%20Ahmad')
  })

  it('encodes special characters', () => {
    expect(buildGuestLink('https://x.test/a', 'Tn. & Ny. Budi')).toBe(
      'https://x.test/a?to=Tn.%20%26%20Ny.%20Budi',
    )
  })

  it('trims and encodes, ignoring surrounding whitespace', () => {
    expect(buildGuestLink('https://x.test/a', '  Ahmad  ')).toBe('https://x.test/a?to=Ahmad')
  })

  it('returns the bare URL when the name is empty/blank/nullish', () => {
    expect(buildGuestLink('https://x.test/a', '')).toBe('https://x.test/a')
    expect(buildGuestLink('https://x.test/a', '   ')).toBe('https://x.test/a')
    expect(buildGuestLink('https://x.test/a', null)).toBe('https://x.test/a')
    expect(buildGuestLink('https://x.test/a', undefined)).toBe('https://x.test/a')
  })
})
