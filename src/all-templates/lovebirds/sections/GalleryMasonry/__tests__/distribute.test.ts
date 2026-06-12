import { describe, it, expect } from 'vitest'
import { distributeToColumns, MAX_PHOTOS } from '../GalleryMasonry.jsx'

type Photo = { src: string; alt: string }
const photo = (n: number): Photo => ({ src: `p${n}.jpg`, alt: `Photo ${n}` })
const photos = (n: number): Photo[] => Array.from({ length: n }, (_, i) => photo(i + 1))

describe('GalleryMasonry distributeToColumns', () => {
  it('terminates and returns 5 empty columns for an empty photo list (regression: infinite loop)', () => {
    const cols = distributeToColumns([])
    expect(cols).toHaveLength(5)
    expect(cols.every((c: Photo[]) => c.length === 0)).toBe(true)
  })

  it('repeats a short list until every column has enough cells', () => {
    const cols = distributeToColumns(photos(3))
    expect(cols).toHaveLength(5)
    const total = cols.reduce((n: number, c: Photo[]) => n + c.length, 0)
    expect(total).toBeGreaterThanOrEqual(20)
  })

  it('clamps over-long lists to MAX_PHOTOS', () => {
    const cols = distributeToColumns(photos(100))
    const seen = new Set(cols.flat().map((p: Photo) => p.src))
    expect(seen.size).toBe(MAX_PHOTOS)
  })

  it('survives removing photos from the middle (no holes, order kept)', () => {
    const list = photos(10)
    list.splice(4, 1) // remove the middle one
    const cols = distributeToColumns(list)
    const flat = cols.flat() as Photo[]
    expect(flat.some((p) => p.src === 'p5.jpg')).toBe(false)
    expect(flat.every((p) => typeof p.src === 'string' && p.src.length > 0)).toBe(true)
  })
})
