import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

const getUser = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => ({ auth: { getUser } }) }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptField as encGuest } from '@/lib/guests/crypto'
import { addGuest, updateGuest, deleteGuest, importGuests, updateInviteMessageTemplate } from '../actions'

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
