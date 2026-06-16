import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

// revalidatePath must be a no-op outside a Next request scope; unstable_cache is
// pulled in transitively by payments/plans → template-plans and must stay a
// passthrough so the module graph loads.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn,
}))

vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { verifyOwnership } from '@/editor/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { addUnlistedAttendance, addWalkInAttendance } from '../actions'

const mockVerify = vi.mocked(verifyOwnership)
const mockAdmin = vi.mocked(createSupabaseAdminClient)

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ id: 'inv-1', owner_user_id: 'u1' })
})

const attendanceRowDb = {
  id: 'att-1',
  invitation_id: 'inv-1',
  guest_id: null,
  rsvp_id: null,
  name_enc: 'Tamu Test',
  guest_count: 1,
  source: 'walkin' as const,
  note_enc: null,
  arrived_at: '2026-06-16T00:00:00Z',
  created_at: '2026-06-16T00:00:00Z',
}

function fakeForPlan(plan: string) {
  return createFakeSupabase({
    tables: {
      invitations: { select: { data: { plan } } },
      guests: { select: { data: { id: 'g1', name_enc: 'X', invitation_id: 'inv-1' } } },
      attendances: { insert: { data: attendanceRowDb } },
    },
  })
}

describe('Buku Tamu server-side Premium gate (entitlement)', () => {
  it('BASIC plan: addUnlistedAttendance is rejected and writes NO attendance row', async () => {
    const fake = fakeForPlan('basic')
    mockAdmin.mockReturnValue(fake as any)

    const res = await addUnlistedAttendance({ slug: 'basic-solary', name: 'Crash The Party', count: 1 })

    expect(res.ok).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })

  it('BASIC plan: addWalkInAttendance is rejected and writes NO attendance row', async () => {
    const fake = fakeForPlan('basic')
    mockAdmin.mockReturnValue(fake as any)

    const res = await addWalkInAttendance({ slug: 'basic-lovebirds', guestId: 'g1', count: 1 })

    expect(res.ok).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })

  it('PREMIUM plan: addUnlistedAttendance proceeds and writes the attendance row', async () => {
    const fake = fakeForPlan('premium')
    mockAdmin.mockReturnValue(fake as any)

    const res = await addUnlistedAttendance({ slug: 'premium-couple', name: 'Real Guest', count: 2 })

    expect(res.ok).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(true)
  })

  it('still enforces ownership: a non-owner is rejected even on a premium-shaped fake', async () => {
    mockVerify.mockResolvedValue(null)
    const fake = fakeForPlan('premium')
    mockAdmin.mockReturnValue(fake as any)

    const res = await addUnlistedAttendance({ slug: 'someone-elses', name: 'Intruder', count: 1 })

    expect(res.ok).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })
})
