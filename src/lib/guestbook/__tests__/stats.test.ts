import { describe, it, expect } from 'vitest'
import { computeStats } from '../stats'

const row = (over: Partial<Parameters<typeof computeStats>[0][number]> = {}) =>
  ({ arrived_at: null, guest_count: 1, source: 'rsvp' as const, ...over })

describe('computeStats', () => {
  it('returns all zeros for no rows', () => {
    expect(computeStats([])).toEqual({
      totalEntries: 0, arrivedCount: 0, notArrivedCount: 0, attendeesArrived: 0, walkinCount: 0,
    })
  })
  it('counts arrived rows and sums their guest_count', () => {
    const s = computeStats([
      row({ arrived_at: '2026-06-08T10:00:00Z', guest_count: 3 }),
      row({ arrived_at: null, guest_count: 2 }),
      row({ arrived_at: '2026-06-08T11:00:00Z', guest_count: 1, source: 'walkin' }),
    ])
    expect(s).toEqual({
      totalEntries: 3, arrivedCount: 2, notArrivedCount: 1, attendeesArrived: 4, walkinCount: 1,
    })
  })
})
