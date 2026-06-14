import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptField as encApp } from '@/lib/crypto/app'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
})

const TOKEN = 'tok-secret-123'
const INV = { id: 'inv-1', is_published: true, is_paid: true, checkin_token: TOKEN }
function confirm(body: any, raw = false) {
  return new Request('http://localhost/api/checkin/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/checkin/confirm', () => {
  it('429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(confirm({ slug: 'x', token: TOKEN, kind: 'rsvp', id: 'r1' }))).status).toBe(429)
  })

  it('400 for invalid JSON and incomplete payloads', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    expect((await POST(confirm('x', true))).status).toBe(400)
    expect((await POST(confirm({ slug: 'x', token: TOKEN, kind: 'rsvp' }))).status).toBe(400) // no id
  })

  it('SECURITY: wrong token is rejected with 403', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    expect((await POST(confirm({ slug: 'x', token: 'WRONG', kind: 'rsvp', id: 'r1' }))).status).toBe(403)
  })

  it('marks an RSVP arrived: inserts an attendance row and returns the name', async () => {
    const fake = createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: {
        invitations: { select: { data: INV } },
        rsvps: { select: { data: { id: 'r1', invitation_id: 'inv-1', guest_name_enc: encApp('Budi Santoso'), guest_count: 2 } } },
        attendances: { select: { data: null }, insert: {} },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(confirm({ slug: 'x', token: TOKEN, kind: 'rsvp', id: 'r1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Budi Santoso')
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'attendances')!
    expect(ins.value.source).toBe('rsvp')
    expect(ins.value.name_enc).not.toBe('Budi Santoso') // encrypted at rest
    expect(ins.value.arrived_at).toBeTruthy()
  })

  it('404 when the RSVP belongs to a DIFFERENT invitation (cross-tenant guard)', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        rpc: { rl_hit: { data: true } },
        tables: {
          invitations: { select: { data: INV } },
          rsvps: { select: { data: { id: 'r1', invitation_id: 'OTHER-inv', guest_name_enc: encApp('X'), guest_count: 1 } } },
        },
      }) as any,
    )
    expect((await POST(confirm({ slug: 'x', token: TOKEN, kind: 'rsvp', id: 'r1' }))).status).toBe(404)
  })

  it('re-arrival updates the existing attendance instead of inserting', async () => {
    const fake = createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: {
        invitations: { select: { data: INV } },
        rsvps: { select: { data: { id: 'r1', invitation_id: 'inv-1', guest_name_enc: encApp('Budi'), guest_count: 1 } } },
        attendances: { select: { data: { id: 'a1' } }, update: {} },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(confirm({ slug: 'x', token: TOKEN, kind: 'rsvp', id: 'r1' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'attendances')).toBe(true)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })
})
