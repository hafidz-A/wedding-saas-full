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
  it('keeps two invited guests who share a name, each with its own label', () => {
    const out = matchCheckinNames('budi', [
      { kind: 'guest', id: 'g1', name: 'Budi Santoso', label: 'Keluarga Pria' },
      { kind: 'guest', id: 'g2', name: 'Budi Santoso', label: 'Teman Kantor' },
      c('guest', 'g3', 'Budiman'),
    ])
    expect(out.map((m) => m.id)).toEqual(['g1', 'g2', 'g3'])
    expect(out.map((m) => m.label)).toEqual(['Keluarga Pria', 'Teman Kantor', null])
  })
  it('an invited guest + their RSVP show once, keeping the guest label', () => {
    const out = matchCheckinNames('budi', [
      { kind: 'guest', id: 'g1', name: 'Budi', label: 'VIP' },
      c('rsvp', 'r1', 'Budi'),
    ])
    expect(out).toEqual([{ kind: 'rsvp', id: 'r1', name: 'Budi', label: 'VIP' }])
  })
  it('two RSVPs under one name are two people', () => {
    expect(matchCheckinNames('budi', [c('rsvp', 'r1', 'Budi'), c('rsvp', 'r2', 'Budi')])).toHaveLength(2)
  })
})

