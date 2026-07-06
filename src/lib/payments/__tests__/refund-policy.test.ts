import { describe, it, expect } from 'vitest'
import { refundVerdict, type UsageSnapshot } from '../refund-policy'

const base: UsageSnapshot = {
  is_published: false, guest_count: 0, rsvp_count: 0, attendance_count: 0,
  config_edited: false, days_since_paid: 0,
}

describe('refundVerdict', () => {
  it('eligible when unused', () => {
    expect(refundVerdict(base).eligible).toBe(true)
    expect(refundVerdict({ ...base, is_published: true, days_since_paid: 2 }).eligible).toBe(true)
  })
  it('not eligible once a guest checked in', () => {
    expect(refundVerdict({ ...base, attendance_count: 1 }).eligible).toBe(false)
  })
  it('not eligible once guests/RSVPs exist', () => {
    expect(refundVerdict({ ...base, guest_count: 5 }).code).toBe('used-guests')
    expect(refundVerdict({ ...base, rsvp_count: 1 }).code).toBe('used-guests')
  })
  it('not eligible when live past the grace window', () => {
    expect(refundVerdict({ ...base, is_published: true, days_since_paid: 10 }).code).toBe('used-live')
  })
})
