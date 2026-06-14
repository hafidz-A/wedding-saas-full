import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { generateToken, hashToken, encryptToken, decryptToken, generateUniqueTokens } from '../token'

beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('generateToken', () => {
  it('returns exactly 6 digits, zero-padded', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateToken()).toMatch(/^\d{6}$/)
    }
  })
})

describe('hashToken', () => {
  it('is deterministic for the same invitation + token', () => {
    expect(hashToken('inv-1', '123456')).toBe(hashToken('inv-1', '123456'))
  })
  it('differs across invitations (HMAC binds invitation_id)', () => {
    expect(hashToken('inv-1', '123456')).not.toBe(hashToken('inv-2', '123456'))
  })
  it('differs across tokens', () => {
    expect(hashToken('inv-1', '123456')).not.toBe(hashToken('inv-1', '654321'))
  })
})

describe('encryptToken / decryptToken', () => {
  it('round-trips', () => {
    const enc = encryptToken('428913')
    expect(enc).not.toBe('428913')
    expect(decryptToken(enc)).toBe('428913')
  })
})

describe('generateUniqueTokens', () => {
  it('returns the requested count of distinct codes', () => {
    const list = generateUniqueTokens(2000)
    expect(list).toHaveLength(2000)
    expect(new Set(list).size).toBe(2000)
    list.forEach((t) => expect(t).toMatch(/^\d{6}$/))
  })
  it('throws when count exceeds the code space guard', () => {
    expect(() => generateUniqueTokens(900_001)).toThrow(/Terlalu banyak/)
  })
})
