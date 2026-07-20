import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { fetchRefundedAt, fetchRefundedMap } from '../refunded'

describe('fetchRefundedAt', () => {
  it('returns confirmed_at when a succeeded initial refund exists', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [{ confirmed_at: '2026-07-18T03:00:00Z' }], error: null } } } })
    expect(await fetchRefundedAt(db, 'inv-1')).toBe('2026-07-18T03:00:00Z')
  })
  it('returns null when there is no such refund', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [], error: null } } } })
    expect(await fetchRefundedAt(db, 'inv-1')).toBeNull()
  })
})

describe('fetchRefundedMap', () => {
  it('maps source_id → confirmed_at and skips nothing else', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [
      { source_id: 'inv-1', confirmed_at: '2026-07-18T03:00:00Z' },
      { source_id: 'inv-2', confirmed_at: null },
    ], error: null } } } })
    const map = await fetchRefundedMap(db, ['inv-1', 'inv-2', 'inv-3'])
    expect(map.get('inv-1')).toBe('2026-07-18T03:00:00Z')
    expect(map.get('inv-2')).toBe('')
    expect(map.has('inv-3')).toBe(false)
  })
  it('short-circuits on an empty id list without querying', async () => {
    const db = createFakeSupabase()
    const map = await fetchRefundedMap(db, [])
    expect(map.size).toBe(0)
    expect(db._calls.length).toBe(0)
  })
})
