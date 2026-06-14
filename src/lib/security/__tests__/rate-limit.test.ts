import { describe, it, expect } from 'vitest'
import { getClientIp } from '../rate-limit'

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/guestbook', { headers })
}

describe('getClientIp', () => {
  it('uses single x-forwarded-for value', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('takes the first IP from a comma list (client, not proxies)', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' }))).toBe(
      '203.0.113.7',
    )
  })

  it('trims surrounding whitespace', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '  203.0.113.7 , 10.0.0.1' }))).toBe(
      '203.0.113.7',
    )
  })

  it('falls back to x-real-ip when no x-forwarded-for', () => {
    expect(getClientIp(reqWith({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
  })

  it('returns "unknown" when no IP headers present', () => {
    expect(getClientIp(reqWith({}))).toBe('unknown')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    expect(
      getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '198.51.100.4' })),
    ).toBe('203.0.113.7')
  })
})
