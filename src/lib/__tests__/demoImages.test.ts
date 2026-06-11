import { describe, it, expect } from 'vitest'
import { DEMO_PHOTOS, demoImg } from '../demoImages'

describe('demoImages registry', () => {
  it('builds a proper Unsplash URL', () => {
    expect(demoImg('bridePortrait', 800)).toMatch(
      /^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?auto=format&fit=crop&w=800&q=80$/,
    )
  })

  it('every key has a non-empty photo id', () => {
    for (const [key, id] of Object.entries(DEMO_PHOTOS)) {
      expect(id, key).toMatch(/^\d+-[a-f0-9]+$/)
    }
  })

  it('throws on unknown key', () => {
    expect(() => demoImg('nope', 100)).toThrow(/unknown demo image key/i)
  })
})
