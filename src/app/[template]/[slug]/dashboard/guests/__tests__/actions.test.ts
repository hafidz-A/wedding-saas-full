import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

const getUser = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => ({ auth: { getUser } }) }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/payments/template-plans', () => ({
  getTemplatePlans: vi.fn(async () => [
    { template_id: 'lovebirds', plan_code: 'basic', display_name: 'B', price_idr: 149000, duration_days: 365, features: [], sort_order: 1, base_guest_quota: 200 },
  ]),
}))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptField as encGuest } from '@/lib/guests/crypto'
import { addGuest, updateGuest, deleteGuest, importGuests, updateInviteMessageTemplate, regenerateGuestToken } from '../actions'
import { hashToken } from '@/lib/guests/token'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
  mockOwner.mockResolvedValue(OWNER)
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

const guestRow = (over: any = {}) => ({
  id: 'g1', invitation_id: 'inv-1', name_enc: encGuest('Budi'), phone_enc: null, group_label: null,
  notes_enc: null, sent_at: null, created_at: 't', updated_at: 't', ...over,
})

describe('addGuest', () => {
  it('throws when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    await expect(addGuest('slug', { name: 'Budi' })).rejects.toThrow(/Forbidden/)
  })

  it('throws on an empty name', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase() as any)
    await expect(addGuest('slug', { name: '   ' })).rejects.toThrow(/required/i)
  })

  it('encrypts the name and returns the decrypted row', async () => {
    const fake = createFakeSupabase({ tables: { guests: { insert: { data: guestRow() } } } })
    mockAdmin.mockReturnValue(fake as any)
    const row = await addGuest('slug', { name: 'Budi' })
    expect(row.name).toBe('Budi') // decrypted back for the client
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'guests')!
    expect(ins.value.name_enc).not.toBe('Budi') // encrypted at rest
    expect(ins.value.invitation_id).toBe('inv-1')
  })
})

describe('updateGuest / deleteGuest — IDOR scoping', () => {
  it('updateGuest scopes by invitation_id and encrypts the patched name', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    await updateGuest('slug', 'g-9', { name: 'Budi Baru' })
    expect(fake._calls.some((c) => c.kind === 'filter' && c.column === 'invitation_id' && c.value === 'inv-1')).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'filter' && c.column === 'id' && c.value === 'g-9')).toBe(true)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'guests')!
    expect(upd.value.name_enc).not.toBe('Budi Baru')
  })

  it('deleteGuest scopes by invitation_id', async () => {
    const fake = createFakeSupabase({ tables: { guests: { delete: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    await deleteGuest('slug', 'g-9')
    expect(fake._calls.some((c) => c.kind === 'delete' && c.table === 'guests')).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'filter' && c.column === 'invitation_id' && c.value === 'inv-1')).toBe(true)
  })
})

describe('importGuests — DoS guards', () => {
  it('rejects a pathologically large paste', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase() as any)
    await expect(importGuests('slug', 'x'.repeat(1_000_001))).rejects.toThrow(/terlalu besar/i)
  })

  it('returns inserted:0 for empty input without inserting', async () => {
    const fake = createFakeSupabase()
    mockAdmin.mockReturnValue(fake as any)
    expect(await importGuests('slug', '   ')).toEqual({ inserted: 0 })
    expect(fake._calls.some((c) => c.kind === 'insert')).toBe(false)
  })
})

describe('updateInviteMessageTemplate', () => {
  it('rejects an unauthenticated caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect((await updateInviteMessageTemplate('slug', 'Hi {{name}}')).ok).toBe(false)
  })

  it('SECURITY: rejects a non-owner', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { id: 'inv-1', owner_user_id: 'someone-else', config: {} } } } } }) as any,
    )
    const r = await updateInviteMessageTemplate('slug', 'Hi {{name}}')
    expect(r).toMatchObject({ ok: false, error: 'Forbidden' })
  })

  it('saves the template into config', async () => {
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: { id: 'inv-1', owner_user_id: 'user-1', config: { meta: {} } } }, update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const r = await updateInviteMessageTemplate('slug', 'Hi {{name}} {{url}}')
    expect(r.ok).toBe(true)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.inviteMessageTemplate).toBe('Hi {{name}} {{url}}')
    expect(upd.value.config.meta).toBeDefined() // preserved
  })
})

describe('addGuest token', () => {
  it('writes an encrypted token + hash on insert', async () => {
    const fake = createFakeSupabase({ tables: { guests: { insert: { data: guestRow() } } } })
    mockAdmin.mockReturnValue(fake as any)
    await addGuest('slug', { name: 'Budi' })
    const ins = fake.lastCall('insert')
    expect(ins?.value.rsvp_token_enc).toBeTruthy()
    expect(ins?.value.rsvp_token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(ins?.value.rsvp_token_enc).not.toMatch(/^\d{6}$/) // not plaintext
  })
})

describe('regenerateGuestToken', () => {
  it('resets used + writes a new hash scoped by invitation_id (IDOR-safe)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null, count: 1 } } } })
    mockAdmin.mockReturnValue(fake as any)
    const { token } = await regenerateGuestToken('slug', 'g1')
    expect(token).toMatch(/^\d{6}$/)
    const upd = fake.lastCall('update')
    expect(upd?.value.token_used_at).toBeNull()
    expect(upd?.value.rsvp_token_hash).toBe(hashToken('inv-1', token))
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'invitation_id' && f.value === 'inv-1')).toBe(true)
    expect(filters.some((f) => f.column === 'id' && f.value === 'g1')).toBe(true)
  })

  it('throws when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    await expect(regenerateGuestToken('slug', 'g1')).rejects.toThrow(/Forbidden/)
  })

  it('throws when the guest does not exist (no row updated)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null, count: 0 } } } })
    mockAdmin.mockReturnValue(fake as any)
    await expect(regenerateGuestToken('slug', 'nope')).rejects.toThrow(/not found/i)
  })
})

describe('importGuests token', () => {
  it('issues a distinct encrypted token + hash per inserted row', async () => {
    const fake = createFakeSupabase({ tables: { guests: { select: { data: [], error: null }, insert: { data: null, count: 2 } } } })
    mockAdmin.mockReturnValue(fake as any)
    await importGuests('slug', 'Budi\nSari')
    const ins = fake.lastCall('insert')
    const rows = ins?.value as any[]
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(2)
    rows.forEach((r) => {
      expect(r.rsvp_token_enc).toBeTruthy()
      expect(r.rsvp_token_hash).toMatch(/^[0-9a-f]{64}$/)
    })
    expect(rows[0].rsvp_token_hash).not.toBe(rows[1].rsvp_token_hash)
  })
})

describe('addGuest — quota enforcement (hard block)', () => {
  it('throws when the guest list is already at the effective quota', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: null, count: 200 }, insert: { data: guestRow() } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(addGuest('slug', { name: 'Budi' })).rejects.toThrow(/kuota/i)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guests')).toBe(false)
  })

  it('allows adding when under quota', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: null, count: 199 }, insert: { data: guestRow() } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(addGuest('slug', { name: 'Budi' })).resolves.toBeTruthy()
  })

  it('counts the purchased add-on into the effective quota', async () => {
    // base 200 + extra 50 = 250; at 200 used, still room.
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 50 } } },
        guests: { select: { data: null, count: 200 }, insert: { data: guestRow() } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(addGuest('slug', { name: 'Budi' })).resolves.toBeTruthy()
  })
})

describe('importGuests — quota enforcement (no truncation)', () => {
  it('rejects an import that would exceed the effective quota', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: [], count: 199 }, insert: { data: null, count: 2 } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(importGuests('slug', 'Budi\nSari')).rejects.toThrow(/kuota/i) // 199 + 2 > 200
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guests')).toBe(false)
  })
})
