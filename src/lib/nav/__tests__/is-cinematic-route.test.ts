import { describe, it, expect } from 'vitest'
import { isCinematicRoute } from '../is-cinematic-route'

describe('isCinematicRoute', () => {
  it('is true for a public invitation path (/<template>/<slug>)', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari', ['lovebirds', 'solary'])).toBe(true)
    expect(isCinematicRoute('/solary/ahmad-rahma', ['lovebirds', 'solary'])).toBe(true)
  })

  it('is false for the dashboard sub-route', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari/dashboard', ['lovebirds', 'solary'])).toBe(false)
  })

  it('is false for marketing/auth routes', () => {
    for (const p of ['/', '/templates', '/login', '/signup', '/onboarding', '/profile']) {
      expect(isCinematicRoute(p, ['lovebirds', 'solary'])).toBe(false)
    }
  })

  it('is false when the first segment is not a known template id', () => {
    expect(isCinematicRoute('/blog/post', ['lovebirds', 'solary'])).toBe(false)
  })

  it('tolerates a trailing slash', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari/', ['lovebirds', 'solary'])).toBe(true)
  })
})
