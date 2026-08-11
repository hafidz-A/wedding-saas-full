import { describe, it, expect } from 'vitest'
import { invitationPublicStatus, invitationIsDown } from '../public-status'

const NOW = Date.UTC(2026, 7, 11)
const PAST = new Date(Date.UTC(2026, 0, 1)).toISOString()
const FUTURE = new Date(Date.UTC(2027, 0, 1)).toISOString()

// A row a guest can fully open: paid, published, unexpired, unsuspended, has content.
const LIVE = {
  is_paid: true,
  is_published: true,
  expires_at: null,
  suspended_at: null,
  config: { sections: [] },
}

describe('invitationPublicStatus', () => {
  it('live when every gate passes', () => {
    expect(invitationPublicStatus(LIVE, NOW)).toBe('live')
  })

  it('unpaid when not paid', () => {
    expect(invitationPublicStatus({ ...LIVE, is_paid: false }, NOW)).toBe('unpaid')
  })

  it('unpublished when paid but not published', () => {
    expect(invitationPublicStatus({ ...LIVE, is_published: false }, NOW)).toBe('unpublished')
  })

  it('expired when the active period has run out', () => {
    expect(invitationPublicStatus({ ...LIVE, expires_at: PAST }, NOW)).toBe('expired')
  })

  it('still live when the expiry is in the future', () => {
    expect(invitationPublicStatus({ ...LIVE, expires_at: FUTURE }, NOW)).toBe('live')
  })

  it('not expired on the exact expiry instant (matches activePeriodStatus)', () => {
    const atBoundary = new Date(NOW).toISOString()
    expect(invitationPublicStatus({ ...LIVE, expires_at: atBoundary }, NOW)).toBe('live')
  })

  it('suspended when an admin has taken it down', () => {
    expect(invitationPublicStatus({ ...LIVE, suspended_at: PAST }, NOW)).toBe('suspended')
  })

  it('refunded when the caller says the initial purchase was refunded', () => {
    expect(invitationPublicStatus(LIVE, NOW, { isRefunded: true })).toBe('refunded')
  })

  it('not_ready when the config is an empty object', () => {
    expect(invitationPublicStatus({ ...LIVE, config: {} }, NOW)).toBe('not_ready')
  })

  it('not_ready when the config is null', () => {
    expect(invitationPublicStatus({ ...LIVE, config: null }, NOW)).toBe('not_ready')
  })

  it('not not_ready when the config has content', () => {
    expect(invitationPublicStatus({ ...LIVE, config: { meta: {} } }, NOW)).toBe('live')
  })

  describe('precedence', () => {
    it('refunded beats suspended (every refund also sets suspended_at)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, suspended_at: PAST }, NOW, { isRefunded: true }),
      ).toBe('refunded')
    })

    it('expired beats suspended (the public page checks expiry first)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, expires_at: PAST, suspended_at: PAST }, NOW),
      ).toBe('expired')
    })

    it('suspended beats unpaid', () => {
      expect(
        invitationPublicStatus({ ...LIVE, suspended_at: PAST, is_paid: false }, NOW),
      ).toBe('suspended')
    })

    it('unpaid beats unpublished (paying is the actionable step)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, is_paid: false, is_published: false }, NOW),
      ).toBe('unpaid')
    })

    it('unpublished beats not_ready', () => {
      expect(
        invitationPublicStatus({ ...LIVE, is_published: false, config: {} }, NOW),
      ).toBe('unpublished')
    })
  })
})

describe('invitationIsDown', () => {
  it('false for a healthy invitation', () => {
    expect(invitationIsDown(LIVE)).toBe(false)
  })

  it('true when suspended', () => {
    expect(invitationIsDown({ ...LIVE, suspended_at: PAST })).toBe(true)
  })

  it('true when refunded', () => {
    expect(invitationIsDown(LIVE, { isRefunded: true })).toBe(true)
  })

  it('false for an unpaid draft — paying is exactly what it needs', () => {
    expect(invitationIsDown({ ...LIVE, is_paid: false })).toBe(false)
  })

  it('false when merely expired — renewing genuinely brings it back', () => {
    expect(invitationIsDown({ ...LIVE, expires_at: PAST })).toBe(false)
  })

  // Regression: invitationPublicStatus collapses this pair to 'expired' (the public
  // page checks expiry first), so a CTA gate derived from that verdict would offer
  // "Perpanjang sekarang" on a suspended invitation. startRenewal never reads
  // suspended_at, so the owner would pay for a renewal that lifts nothing.
  it('true when suspended AND expired, which the public verdict reports as expired', () => {
    const both = { ...LIVE, suspended_at: PAST, expires_at: PAST }
    expect(invitationPublicStatus(both, NOW)).toBe('expired')
    expect(invitationIsDown(both)).toBe(true)
  })
})
