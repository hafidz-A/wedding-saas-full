import { describe, it, expect } from 'vitest'
import { timingSafeStrEqual } from '../timing'

describe('timingSafeStrEqual', () => {
  it('true for identical strings', () => {
    expect(timingSafeStrEqual('s3cr3t-token', 's3cr3t-token')).toBe(true)
  })

  it('false for same-length but different strings', () => {
    expect(timingSafeStrEqual('aaaaaa', 'aaaaab')).toBe(false)
  })

  it('false for different-length strings (no throw)', () => {
    expect(timingSafeStrEqual('short', 'longertoken')).toBe(false)
  })

  it('true for two empty strings', () => {
    expect(timingSafeStrEqual('', '')).toBe(true)
  })

  it('handles unicode by byte content', () => {
    expect(timingSafeStrEqual('café', 'café')).toBe(true)
    // 'é' is 2 UTF-8 bytes, so byte-length differs from 'cafe' → false
    expect(timingSafeStrEqual('café', 'cafe')).toBe(false)
  })
})
