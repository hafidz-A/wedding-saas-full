import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { hashToken } from '../token'
import { consumeGuestToken } from '../tokenGate'

beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('consumeGuestToken', () => {
  it('returns false for a malformed token without touching the DB', async () => {
    const fake = createFakeSupabase()
    expect(await consumeGuestToken(fake, 'inv-1', 'abc')).toBe(false)
    expect(fake.lastCall('update')).toBeUndefined()
  })

  it('consumes and returns true when an unused matching row exists', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: { id: 'g1' } } } } })
    expect(await consumeGuestToken(fake, 'inv-1', '123456')).toBe(true)
    const upd = fake.lastCall('update')
    expect(upd?.value).toHaveProperty('token_used_at')
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'invitation_id' && f.value === 'inv-1')).toBe(true)
    expect(filters.some((f) => f.column === 'rsvp_token_hash' && f.value === hashToken('inv-1', '123456'))).toBe(true)
    // the single-use race guard must be applied: token_used_at IS NULL
    expect(filters.some((f) => f.column === 'token_used_at' && f.value === null)).toBe(true)
  })

  it('returns false when no unused row matched (wrong or already-used)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null } } } })
    expect(await consumeGuestToken(fake, 'inv-1', '999999')).toBe(false)
  })

  it('throws when the DB errors', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { error: { message: 'boom' } } } } })
    await expect(consumeGuestToken(fake, 'inv-1', '123456')).rejects.toBeTruthy()
  })
})
