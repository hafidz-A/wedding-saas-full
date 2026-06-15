import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { hashToken } from '../token'
import { consumeGuestToken, consumeGuestTokenForRsvp, markGuestRsvpSubmitted } from '../tokenGate'

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

describe('consumeGuestTokenForRsvp', () => {
  it('returns invalid for a malformed token without touching the DB', async () => {
    const fake = createFakeSupabase()
    expect((await consumeGuestTokenForRsvp(fake, 'inv-1', 'abc')).result).toBe('invalid')
    expect(fake.lastCall('update')).toBeUndefined()
  })

  it('returns ok + guestId when an unused, not-yet-rsvped row is consumed', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: { id: 'g1' } } } } })
    const r = await consumeGuestTokenForRsvp(fake, 'inv-1', '123456')
    expect(r).toEqual({ result: 'ok', guestId: 'g1' })
    const upd = fake.lastCall('update')
    expect(upd?.value).toHaveProperty('token_used_at')
    // atomic consume guards on BOTH token_used_at and rsvp_submitted_at being null
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'rsvp_token_hash' && f.value === hashToken('inv-1', '123456'))).toBe(true)
    expect(filters.some((f) => f.column === 'token_used_at' && f.value === null)).toBe(true)
    expect(filters.some((f) => f.column === 'rsvp_submitted_at' && f.value === null)).toBe(true)
  })

  it('returns already_rsvped when the row exists but rsvp_submitted_at is set', async () => {
    const fake = createFakeSupabase({
      tables: { guests: { update: { data: null }, select: { data: { rsvp_submitted_at: '2026-06-15T00:00:00Z' } } } },
    })
    expect((await consumeGuestTokenForRsvp(fake, 'inv-1', '123456')).result).toBe('already_rsvped')
  })

  it('returns invalid when no row matches (wrong/old code) and diagnostic is empty', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null }, select: { data: null } } } })
    expect((await consumeGuestTokenForRsvp(fake, 'inv-1', '999999')).result).toBe('invalid')
  })

  it('returns invalid when the row exists but rsvp_submitted_at is null (code spent on ucapan)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null }, select: { data: { rsvp_submitted_at: null } } } } })
    expect((await consumeGuestTokenForRsvp(fake, 'inv-1', '123456')).result).toBe('invalid')
  })

  it('throws when the atomic update errors', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { error: { message: 'boom' } } } } })
    await expect(consumeGuestTokenForRsvp(fake, 'inv-1', '123456')).rejects.toBeTruthy()
  })
})

describe('markGuestRsvpSubmitted', () => {
  it('stamps rsvp_submitted_at for the guest id (only if still null)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: { id: 'g1' } } } } })
    await markGuestRsvpSubmitted(fake, 'g1')
    const upd = fake.lastCall('update')
    expect(upd?.value).toHaveProperty('rsvp_submitted_at')
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'id' && f.value === 'g1')).toBe(true)
  })
})
