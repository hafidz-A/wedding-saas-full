import { describe, it, expect } from 'vitest'
import { refundVerdict, type UsageSnapshot } from '../refund-policy'

const base: UsageSnapshot = {
  is_published: false, guest_count: 0, rsvp_count: 0, attendance_count: 0,
  config_edited: false, days_since_paid: 0, ever_used: false, days_since_published: null,
}

describe('refundVerdict', () => {
  it('eligible when unused', () => {
    expect(refundVerdict(base).eligible).toBe(true)
    expect(refundVerdict({ ...base, days_since_published: 2 }).eligible).toBe(true)
  })
  it('STICKY: ever_used stays not-eligible even after guests were deleted (counts back to 0)', () => {
    const v = refundVerdict({ ...base, ever_used: true, guest_count: 0, rsvp_count: 0, attendance_count: 0 })
    expect(v.eligible).toBe(false)
    expect(v.code).toBe('used-ever')
  })
  it('not eligible once a guest checked in', () => {
    expect(refundVerdict({ ...base, attendance_count: 1 }).eligible).toBe(false)
  })
  it('not eligible once guests/RSVPs exist', () => {
    expect(refundVerdict({ ...base, guest_count: 5 }).code).toBe('used-guests')
    expect(refundVerdict({ ...base, rsvp_count: 1 }).code).toBe('used-guests')
  })
  it('not eligible once published past the grace window (sticky, even if now unpublished)', () => {
    expect(refundVerdict({ ...base, is_published: false, days_since_published: 10 }).code).toBe('used-live')
  })
})
