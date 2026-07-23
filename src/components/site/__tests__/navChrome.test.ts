import { describe, it, expect } from 'vitest'
import { resolveNavChrome } from '../navChrome'

describe('resolveNavChrome', () => {
  it('shows nothing on the landing page', () => {
    expect(resolveNavChrome('/')).toEqual({ back: false, home: false })
  })
  it('shows home only on entry / hub / email-entry pages', () => {
    for (const p of ['/login', '/onboarding', '/profile', '/verify-signup', '/reset-password']) {
      expect(resolveNavChrome(p)).toEqual({ back: false, home: true })
    }
  })
  it('shows back + home on mid-flow and dead-end pages', () => {
    for (const p of ['/signup', '/forgot-password', '/terms', '/privacy', '/refund', '/x-unknown-404']) {
      expect(resolveNavChrome(p)).toEqual({ back: true, home: true })
    }
  })
  it('shows back + home on owner dashboard routes', () => {
    expect(resolveNavChrome('/lovebirds/adi-rani/dashboard')).toEqual({ back: true, home: true })
  })
})
