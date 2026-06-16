import { describe, it, expect } from 'vitest'
import { omitColumns } from '../csv'

describe('omitColumns', () => {
  it('drops the named columns and keeps the rest in order', () => {
    const rows = [
      { id: 'abc', guest_name: 'Ahmad', attending: true, created_at: '2026-01-01' },
      { id: 'def', guest_name: 'Bima', attending: false, created_at: '2026-01-02' },
    ]
    const out = omitColumns(rows, ['id', 'created_at'])
    expect(Object.keys(out[0])).toEqual(['guest_name', 'attending'])
    expect(out[1]).toEqual({ guest_name: 'Bima', attending: false })
  })

  it('returns empty array unchanged', () => {
    expect(omitColumns([], ['id'])).toEqual([])
  })

  it('is a no-op when no keys match', () => {
    const rows = [{ a: 1, b: 2 }]
    expect(omitColumns(rows, ['z'])).toEqual([{ a: 1, b: 2 }])
  })
})
