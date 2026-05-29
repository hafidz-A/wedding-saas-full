import { describe, it, expect } from 'vitest'
import { isIdleExpired, IDLE_TIMEOUT_MS } from '../idle-timeout'

describe('isIdleExpired', () => {
  const now = 1_000_000_000_000

  it('is false when activity is within the window', () => {
    expect(isIdleExpired(now - (IDLE_TIMEOUT_MS - 1000), now)).toBe(false)
  })

  it('is true when idle longer than the window', () => {
    expect(isIdleExpired(now - (IDLE_TIMEOUT_MS + 1000), now)).toBe(true)
  })

  it('is false when there is no recorded activity (0)', () => {
    expect(isIdleExpired(0, now)).toBe(false)
  })

  it('uses the 4-hour default', () => {
    expect(IDLE_TIMEOUT_MS).toBe(4 * 60 * 60 * 1000)
  })

  it('honors a custom window', () => {
    expect(isIdleExpired(now - 5000, now, 4000)).toBe(true)
    expect(isIdleExpired(now - 3000, now, 4000)).toBe(false)
  })
})
