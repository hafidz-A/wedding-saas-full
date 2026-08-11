import { describe, it, expect } from 'vitest'
import { looksEncrypted } from '../encryption-shape.mjs'

/** 12-byte IV + 5-byte ciphertext + 16-byte tag = 33 bytes, the smallest
 *  realistic AES-GCM payload this codebase produces. */
const CIPHERTEXT_SHAPED = Buffer.alloc(33, 1).toString('base64')

describe('looksEncrypted', () => {
  it('accepts a base64 payload long enough to hold IV + ciphertext + tag', () => {
    expect(looksEncrypted(CIPHERTEXT_SHAPED)).toBe(true)
  })

  it('rejects ordinary plaintext', () => {
    expect(looksEncrypted('Budi Santoso')).toBe(false)
    expect(looksEncrypted('+6281234567890')).toBe(false)
    expect(looksEncrypted('budi@example.com')).toBe(false)
  })

  it('rejects anything too short to be IV + tag', () => {
    expect(looksEncrypted(Buffer.alloc(20, 1).toString('base64'))).toBe(false)
    expect(looksEncrypted('SGVsbG8=')).toBe(false)
  })

  it('rejects non-strings and empties', () => {
    expect(looksEncrypted(null)).toBe(false)
    expect(looksEncrypted(undefined)).toBe(false)
    expect(looksEncrypted(42)).toBe(false)
    expect(looksEncrypted('')).toBe(false)
  })

  it('DOCUMENTED LIMIT: long letters-only plaintext passes the shape test', () => {
    // This is why the caller must ALSO prove the value decrypts with the real
    // key. Shape alone is necessary, never sufficient — a name with no spaces
    // or punctuation is itself valid base64.
    expect(looksEncrypted('NamaPanjangTanpaSpasiSamaSekaliYangLolosSaring')).toBe(true)
  })
})
