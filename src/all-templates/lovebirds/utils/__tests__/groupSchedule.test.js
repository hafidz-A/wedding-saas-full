import { describe, it, expect } from 'vitest'
import { groupSchedule } from '../groupSchedule.js'

describe('groupSchedule', () => {
  it('folds description-only items into the event above (the customer rundown)', () => {
    const g = groupSchedule([
      { id: 'a', time: '08.00', title: 'Akad Nikah', description: '', accent: 'purple', icon: 'rings' },
      { id: 'b', time: '', title: '', description: 'Kedatangan keluarga inti', accent: 'coral' },
      { id: 'c', time: '', title: '', description: 'Khotbah nikah', accent: 'coral' },
      { id: 'd', time: '11.00 sd selesai', title: 'Resepsi', description: '', accent: 'coral' },
      { id: 'e', time: '', title: '', description: 'Pembukaan area resepsi' },
    ])
    expect(g).toEqual([
      { key: 'a', time: '08.00', title: 'Akad Nikah', icon: 'rings', accent: 'purple', points: ['Kedatangan keluarga inti', 'Khotbah nikah'] },
      { key: 'd', time: '11.00 sd selesai', title: 'Resepsi', icon: undefined, accent: 'coral', points: ['Pembukaan area resepsi'] },
    ])
  })

  it('keeps the head description as the first point(s)', () => {
    const g = groupSchedule([
      { time: '08.00', title: 'Akad', description: '• Satu • Dua' },
      { description: 'Tiga' },
    ])
    expect(g[0].points).toEqual(['Satu', 'Dua', 'Tiga'])
  })

  it('an item with only a time, or only a title, starts its own card', () => {
    const g = groupSchedule([
      { time: '08.00', title: 'Akad' },
      { time: '09.00', title: '', description: 'Foto' },
      { time: '', title: 'Makan siang', description: '' },
    ])
    expect(g.map((x) => [x.time, x.title])).toEqual([['08.00', 'Akad'], ['09.00', ''], ['', 'Makan siang']])
  })

  it('a leading description-only item stays a card; fully empty items vanish', () => {
    const g = groupSchedule([{ description: 'Intro' }, { time: '', title: '', description: '' }, null])
    expect(g).toHaveLength(1)
    expect(g[0].points).toEqual(['Intro'])
  })

  it('plain demo schedule is unchanged (one card per item)', () => {
    const g = groupSchedule([
      { id: 's1', time: '15:30', title: 'Guest Arrival', description: 'Welcome drinks.', accent: 'coral' },
      { id: 's2', time: '16:00', title: 'Ceremony', description: 'Vows.', accent: 'emerald' },
    ])
    expect(g.map((x) => x.points)).toEqual([['Welcome drinks.'], ['Vows.']])
  })

  it('handles non-arrays', () => {
    expect(groupSchedule(undefined)).toEqual([])
  })
})
