import { describe, it, expect } from 'vitest'
import { checkPassword, isPasswordValid, MIN_PASSWORD_LENGTH } from '../passwordPolicy'

describe('passwordPolicy', () => {
  it('MIN_PASSWORD_LENGTH is 8', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })

  describe('checkPassword — per-rule flags', () => {
    it('all true for a strong password', () => {
      expect(checkPassword('Abcdef1!')).toEqual({
        length: true,
        upper: true,
        number: true,
        symbol: true,
      })
    })

    it('length boundary: 7 chars fails, 8 passes', () => {
      expect(checkPassword('Abcde1!').length).toBe(false) // 7 chars
      expect(checkPassword('Abcdef1!').length).toBe(true) // 8 chars
    })

    it('upper false when no uppercase letter', () => {
      expect(checkPassword('abcdef1!').upper).toBe(false)
    })

    it('number false when no digit', () => {
      expect(checkPassword('Abcdefg!').number).toBe(false)
    })

    it('symbol false when alphanumeric only', () => {
      expect(checkPassword('Abcdefg1').symbol).toBe(false)
    })

    it('treats any non-alphanumeric (incl. unicode) as a symbol', () => {
      expect(checkPassword('Abcdefg1§').symbol).toBe(true)
    })
  })

  describe('isPasswordValid — AND of all rules', () => {
    it('true when every rule passes', () => {
      expect(isPasswordValid('Abcdef1!')).toBe(true)
    })

    it('lowercase is NOT required (upper+number+symbol+len suffices)', () => {
      expect(isPasswordValid('ABCDEF1!')).toBe(true)
    })

    it('false if exactly one rule fails', () => {
      expect(isPasswordValid('abcdef1!'), 'no uppercase').toBe(false)
      expect(isPasswordValid('Abcdefg!'), 'no number').toBe(false)
      expect(isPasswordValid('Abcdefg1'), 'no symbol').toBe(false)
      expect(isPasswordValid('Abc1!'), 'too short').toBe(false)
    })

    it('false for empty string', () => {
      expect(isPasswordValid('')).toBe(false)
    })
  })
})
