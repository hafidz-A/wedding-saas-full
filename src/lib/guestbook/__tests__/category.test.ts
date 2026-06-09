import { describe, it, expect } from 'vitest'
import { attendanceCategory } from '../category'

describe('attendanceCategory', () => {
  it('classifies an RSVP row', () => {
    expect(attendanceCategory({ source: 'rsvp', guest_id: null })).toBe('rsvp')
    expect(attendanceCategory({ source: 'rsvp', guest_id: 'g1' })).toBe('rsvp')
  })
  it('classifies a listed walk-in (has guest_id)', () => {
    expect(attendanceCategory({ source: 'walkin', guest_id: 'g1' })).toBe('walkin')
  })
  it('classifies an unlisted walk-in (no guest_id)', () => {
    expect(attendanceCategory({ source: 'walkin', guest_id: null })).toBe('unlisted')
  })
})
