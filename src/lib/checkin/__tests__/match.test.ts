import { describe, it, expect } from 'vitest'
import { matchCheckinNames, type CheckinCandidate } from '../match'

const c = (kind: 'guest' | 'rsvp', id: string, name: string): CheckinCandidate => ({ kind, id, name })

describe('matchCheckinNames', () => {
  it('returns nothing for queries shorter than 3 chars', () => {
    expect(matchCheckinNames('bu', [c('guest', '1', 'Budi')])).toEqual([])
  })
  it('substring-matches case/space-insensitively', () => {
    const out = matchCheckinNames('  BUD ', [c('guest', '1', 'Budi Santoso'), c('guest', '2', 'Ani')])
    expect(out.map((m) => m.id)).toEqual(['1'])
  })
  it('dedupes by normalized name, preferring an rsvp candidate', () => {
    const out = matchCheckinNames('budi', [c('guest', 'g', 'Budi'), c('rsvp', 'r', 'budi')])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'rsvp', id: 'r' })
  })
  it('caps results to the limit', () => {
    const many = Array.from({ length: 9 }, (_, i) => c('guest', String(i), `Budiman ${i}`))
    expect(matchCheckinNames('budiman', many, 5)).toHaveLength(5)
  })
})
