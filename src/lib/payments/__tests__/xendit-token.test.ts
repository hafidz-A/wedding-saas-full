import { describe, it, expect, beforeEach } from 'vitest'
import { isValidCallbackToken } from '../xendit'

describe('isValidCallbackToken', () => {
  beforeEach(() => {
    process.env.XENDIT_CALLBACK_TOKEN = 'secret-token'
  })

  it('accepts the exact token', () => {
    expect(isValidCallbackToken('secret-token')).toBe(true)
  })
  it('rejects a wrong token', () => {
    expect(isValidCallbackToken('nope')).toBe(false)
  })
  it('rejects null/empty', () => {
    expect(isValidCallbackToken(null)).toBe(false)
    expect(isValidCallbackToken('')).toBe(false)
  })
})
