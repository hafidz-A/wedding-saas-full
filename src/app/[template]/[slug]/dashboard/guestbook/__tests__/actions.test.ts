import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
// unstable_cache is pulled in transitively via payments/plans → template-plans
// (the new server-side Premium gate); keep it a passthrough so the graph loads.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }))
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
          // authorizeOwnership now re-checks the plan server-side (Premium gate).
          invitations: { select: { data: { plan: 'premium' } } },
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
      createFakeSupabase({ tables: { invitations: { select: { data: { plan: 'premium' } } }, guests: { select: { data: { id: 'g1', name_enc: encGuest('X'), invitation_id: 'OTHER-inv' } } } } }) as any,
    )
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 1 })
    expect(r).toMatchObject({ ok: false, code: 'not_found' })
  })

  it('inserts source=walkin for an invited guest who has NOT RSVP’d', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'premium' } } },
        guests: { select: { data: { id: 'g1', name_enc: encGuest('Budi'), invitation_id: 'inv-1', rsvp_submitted_at: null } } },
        attendances: {
          select: { data: null }, // no existing ledger row
          insert: { data: { id: 'a1', invitation_id: 'inv-1', guest_id: 'g1', rsvp_id: null, name_enc: 'Budi', guest_count: 2, source: 'walkin', note_enc: null, arrived_at: 't', created_at: 't' } },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 2 })
    expect(r).toMatchObject({ ok: true, updated: false })
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'attendances')!
    expect(ins.value.source).toBe('walkin')
    expect(ins.value.guest_id).toBe('g1')
  })

  it('inserts source=rsvp when the guest already filled the RSVP', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'premium' } } },
        guests: { select: { data: { id: 'g1', name_enc: encGuest('Budi'), invitation_id: 'inv-1', rsvp_submitted_at: '2026-06-15T00:00:00Z' } } },
        attendances: {
          select: { data: null },
          insert: { data: { id: 'a1', invitation_id: 'inv-1', guest_id: 'g1', rsvp_id: null, name_enc: 'Budi', guest_count: 1, source: 'rsvp', note_enc: null, arrived_at: 't', created_at: 't' } },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 1 })
    expect(r.ok).toBe(true)
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'attendances')!
    expect(ins.value.source).toBe('rsvp')
  })

  it('reconciles the head-count when the guest already has a ledger row', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'premium' } } },
        guests: { select: { data: { id: 'g1', name_enc: encGuest('Budi'), invitation_id: 'inv-1', rsvp_submitted_at: '2026-06-15T00:00:00Z' } } },
        attendances: {
          select: { data: { id: 'a1' } }, // existing row → update path
          update: { data: { id: 'a1', invitation_id: 'inv-1', guest_id: 'g1', rsvp_id: null, name_enc: 'Budi', guest_count: 5, source: 'rsvp', note_enc: null, arrived_at: 't', created_at: 't' } },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await addWalkInAttendance({ slug: 'slug', guestId: 'g1', count: 5 })
    expect(r).toMatchObject({ ok: true, updated: true })
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'attendances')!
    expect(upd.value.guest_count).toBe(5)
    expect(upd.value.source).toBe('rsvp')
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })
})

describe('addUnlistedAttendance', () => {
  it('requires a name', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { plan: 'premium' } } } } }) as any)
    expect((await addUnlistedAttendance({ slug: 'slug', name: '   ', count: 1 })).ok).toBe(false)
  })

  it('inserts with guest_id null, source=unregistered, and an encrypted name', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'premium' } } },
        attendances: {
          insert: { data: { id: 'a1', invitation_id: 'inv-1', guest_id: null, rsvp_id: null, name_enc: 'Tamu Tak Terdaftar', guest_count: 3, source: 'unregistered', note_enc: null, arrived_at: 't', created_at: 't' } },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await addUnlistedAttendance({ slug: 'slug', name: 'Tamu Tak Terdaftar', count: 3 })
    expect(r.ok).toBe(true)
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'attendances')!
    expect(ins.value.guest_id).toBeNull()
    expect(ins.value.source).toBe('unregistered')
    expect(ins.value.name_enc).not.toBe('Tamu Tak Terdaftar') // encrypted at rest
  })
})

describe('deleteAttendance', () => {
  it('scopes the delete by invitation_id (IDOR guard)', async () => {
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: { plan: 'premium' } } }, attendances: { delete: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const r = await deleteAttendance('slug', 'att-9')
    expect(r.ok).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'delete' && c.table === 'attendances')).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'filter' && c.column === 'invitation_id' && c.value === 'inv-1')).toBe(true)
  })
})

describe('ensureCheckinToken', () => {
  it('returns the existing token without rotating it', async () => {
    // First invitations.select is the Premium gate (authorizeOwnership); the
    // second is the action's own checkin_token read — scripted in order.
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: [{ data: { plan: 'premium' } }, { data: { checkin_token: 'existing-tok' } }] } } }) as any)
    expect(await ensureCheckinToken('slug')).toEqual({ ok: true, token: 'existing-tok' })
  })

  it('generates and stores a fresh token on first use', async () => {
    const fake = createFakeSupabase({ tables: { invitations: { select: [{ data: { plan: 'premium' } }, { data: { checkin_token: null } }], update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const r = await ensureCheckinToken('slug')
    expect(r.ok).toBe(true)
    expect(r.token).toMatch(/^[a-f0-9]{32}$/) // 16 random bytes hex
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'invitations')).toBe(true)
  })
})
