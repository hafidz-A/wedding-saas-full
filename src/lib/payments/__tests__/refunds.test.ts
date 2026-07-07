import { describe, it, expect } from 'vitest'
import { reverseEntitlement, settleRefund } from '../refunds'

/**
 * Minimal chainable Supabase-ish fake: every builder method returns the same
 * thenable, which resolves to `{ data }` (also for maybeSingle). `update`/`insert`
 * payloads are recorded so we can assert what the money code wrote.
 */
function fakeDb(dataByTable: Record<string, any>) {
  const calls: { table: string; op: string; payload?: any }[] = []
  const from = (table: string) => {
    const result = { data: dataByTable[table] ?? null }
    const p: any = Promise.resolve(result)
    p.select = () => p
    p.eq = () => p
    p.neq = () => p
    p.limit = () => p
    p.maybeSingle = () => Promise.resolve(result)
    p.update = (payload: any) => { calls.push({ table, op: 'update', payload }); return p }
    p.insert = (payload: any) => { calls.push({ table, op: 'insert', payload }); return p }
    return p
  }
  return { db: { from }, calls }
}

describe('reverseEntitlement', () => {
  it('addon → decrements guest_quota_extra by the add-on qty (clamped at 0)', async () => {
    const { db, calls } = fakeDb({ quota_addons: { qty_guests: 50 }, invitations: { guest_quota_extra: 200 } })
    await reverseEntitlement(db, { source_type: 'addon', source_id: 'ad1', invitation_id: 'inv1' })
    const upd = calls.find((c) => c.table === 'invitations' && c.op === 'update')
    expect(upd?.payload).toEqual({ guest_quota_extra: 150 })
  })

  it('addon → never goes negative', async () => {
    const { db, calls } = fakeDb({ quota_addons: { qty_guests: 500 }, invitations: { guest_quota_extra: 100 } })
    await reverseEntitlement(db, { source_type: 'addon', source_id: 'ad1', invitation_id: 'inv1' })
    expect(calls.find((c) => c.table === 'invitations')?.payload).toEqual({ guest_quota_extra: 0 })
  })

  it('initial → unpublishes AND suspends (blocks re-publish)', async () => {
    const { db, calls } = fakeDb({})
    await reverseEntitlement(db, { source_type: 'initial', source_id: 'inv1', invitation_id: 'inv1' })
    const upd = calls.find((c) => c.table === 'invitations' && c.op === 'update')
    expect(upd?.payload.is_published).toBe(false)
    expect(typeof upd?.payload.suspended_at).toBe('string')
  })
})

describe('settleRefund (idempotency)', () => {
  it('reverses entitlement when the compare-and-set locks the row', async () => {
    const { db, calls } = fakeDb({ refunds: [{ id: 'r1', invitation_id: 'inv1', source_type: 'initial', source_id: 'inv1' }] })
    const ok = await settleRefund(db, 'r1')
    expect(ok).toBe(true)
    // CAS ran on refunds + entitlement reversed on invitations (suspend).
    expect(calls.some((c) => c.table === 'invitations' && c.op === 'update')).toBe(true)
  })

  it('does NOT reverse again when already settled (CAS returns no row)', async () => {
    const { db, calls } = fakeDb({ refunds: [] }) // compare-and-set locked nobody
    const ok = await settleRefund(db, 'r1')
    expect(ok).toBe(true)
    expect(calls.some((c) => c.table === 'invitations' && c.op === 'update')).toBe(false)
  })
})
