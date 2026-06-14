import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptField as encGuest } from '@/lib/guests/crypto'
import {
  searchWalkInGuests,
  addWalkInAttendance,
  addUnlistedAttendance,
  deleteAttendance,
  ensureCheckinToken,
} from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
  mockOwner.mockResolvedValue(OWNER)
})

describe('searchWalkInGuests', () => {
  it('throws when the caller is not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    await expect(searchWalkInGuests('slug', 'budi')).rejects.toThrow(/Forbidden/)
  })

  it('decrypts names, substring-matches, and masks the phone', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          guests: {
            select: {
              data: [
                { id: 'g1', name_enc: encGuest('Budi Santoso'), phone_enc: encGuest('+628123456789'), group_label: 'Family' },
                { id: 'g2', name_enc: encGuest('Rina Melati'), phone_enc: null, group_label: null },
              ],
            },
          },
        },
      }) as any,
    )
    const hits = await searchWalkInGuests('slug', 'budi')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ id: 'g1', name: 'Budi Santoso', phone_masked: '•••• 6789' })
  })
})

describe('addWalkInAttendance', () => {
  it('SECURITY: refuses a guest from another invitation', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { guests: { select: { data: { id: 'g1', name_enc: encGuest('X'), invitation_id: 'OTHER-inv' } } } } }) as any,
    )
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 1 })
    expect(r).toMatchObject({ ok: false, code: 'not_found' })
  })

  it('maps a unique-violation to a friendly duplicate result', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          guests: { select: { data: { id: 'g1', name_enc: encGuest('Budi'), invitation_id: 'inv-1' } } },
          attendances: { insert: { error: { code: '23505', message: 'dup' } } },
        },
      }) as any,
    )
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 1 })
    expect(r).toMatchObject({ ok: false, code: 'duplicate' })
  })
})

describe('addUnlistedAttendance', () => {
  it('requires a name', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase() as any)
    expect((await addUnlistedAttendance({ slug: 'slug', name: '   ', count: 1 })).ok).toBe(false)
  })

  it('inserts with guest_id null and an encrypted name', async () => {
    const fake = createFakeSupabase({
      tables: {
        attendances: {
          insert: { data: { id: 'a1', invitation_id: 'inv-1', guest_id: null, rsvp_id: null, name_enc: 'Tamu Tak Terdaftar', guest_count: 3, source: 'walkin', note_enc: null, arrived_at: 't', created_at: 't' } },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await addUnlistedAttendance({ slug: 'slug', name: 'Tamu Tak Terdaftar', count: 3 })
    expect(r.ok).toBe(true)
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'attendances')!
    expect(ins.value.guest_id).toBeNull()
    expect(ins.value.source).toBe('walkin')
    expect(ins.value.name_enc).not.toBe('Tamu Tak Terdaftar') // encrypted at rest
  })
})

describe('deleteAttendance', () => {
  it('scopes the delete by invitation_id (IDOR guard)', async () => {
    const fake = createFakeSupabase({ tables: { attendances: { delete: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const r = await deleteAttendance('slug', 'att-9')
    expect(r.ok).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'delete' && c.table === 'attendances')).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'filter' && c.column === 'invitation_id' && c.value === 'inv-1')).toBe(true)
  })
})

describe('ensureCheckinToken', () => {
  it('returns the existing token without rotating it', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { checkin_token: 'existing-tok' } } } } }) as any)
    expect(await ensureCheckinToken('slug')).toEqual({ ok: true, token: 'existing-tok' })
  })

  it('generates and stores a fresh token on first use', async () => {
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: { checkin_token: null } }, update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const r = await ensureCheckinToken('slug')
    expect(r.ok).toBe(true)
    expect(r.token).toMatch(/^[a-f0-9]{32}$/) // 16 random bytes hex
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'invitations')).toBe(true)
  })
})
