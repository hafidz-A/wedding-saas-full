import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

// Replace the admin client; each test configures the fake via mockReturnValue.
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)

beforeAll(() => {
  // encryptField reads this at call-time; required for the insert path.
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  // hashToken (consumeGuestToken) reads this; required for the token-gate path.
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
})

const LIVE = { id: 'inv-1', is_published: true, is_paid: true }

function post(body: any, raw = false) {
  return new Request('http://localhost/api/rsvp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

/** Happy-path fake: rate limit allowed, live invitation, inserts succeed. */
function liveFake() {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: LIVE } },
      rsvps: { insert: { data: { id: 'rsvp-1' } } },
      attendances: { insert: { data: { id: 'att-1' } } },
    },
  })
}

describe('POST /api/rsvp', () => {
  it('rejects invalid JSON with 400', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    const res = await POST(post('{ not json', true))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Invalid JSON/)
  })

  it('rejects missing required fields with 400', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    expect((await POST(post({ guest_name: 'A', attending: true }))).status).toBe(400) // no slug
    expect((await POST(post({ slug: 'x', attending: true }))).status).toBe(400) // no name
    expect((await POST(post({ slug: 'x', guest_name: 'A' }))).status).toBe(400) // attending not bool
    expect((await POST(post({ slug: 'x', guest_name: 'A', attending: 'yes' }))).status).toBe(400)
  })

  it('returns 404 when the invitation does not exist', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any,
    )
    const res = await POST(post({ slug: 'ghost', guest_name: 'A', attending: true }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when the invitation is not published+paid', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: { invitations: { select: { data: { id: 'inv-2', is_published: false, is_paid: true } } } },
      }) as any,
    )
    const res = await POST(post({ slug: 'draft', guest_name: 'A', attending: true }))
    expect(res.status).toBe(403)
  })

  it('happy path: 200, encrypts guest name, and auto-populates attendance when attending', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'Budi Santoso', attending: true, guest_count: 2, token: '123456' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)

    const rsvpInsert = fake._calls.find((c) => c.kind === 'insert' && c.table === 'rsvps')
    expect(rsvpInsert, 'should insert into rsvps').toBeTruthy()
    // PII must be encrypted at rest — never the raw plaintext.
    expect(rsvpInsert!.value.guest_name_enc).not.toBe('Budi Santoso')
    expect(typeof rsvpInsert!.value.guest_name_enc).toBe('string')
    expect(rsvpInsert!.value.guest_count).toBe(2)
    // attending → attendance ledger row created
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(true)
  })

  it('does NOT create an attendance row when not attending', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: false, token: '123456' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })

  it('clamps absurd guest_count to the abuse ceiling (999)', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    await POST(post({ slug: 'x', guest_name: 'A', attending: true, guest_count: 100000, token: '123456' }))
    const rsvpInsert = fake._calls.find((c) => c.kind === 'insert' && c.table === 'rsvps')
    expect(rsvpInsert!.value.guest_count).toBe(999)
  })

  it('returns 500 when the rsvp insert fails', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          invitations: { select: { data: LIVE } },
          guests: { update: { data: { id: 'g1' } } },
          rsvps: { insert: { data: null, error: { message: 'boom' } } },
        },
      }) as any,
    )
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true, token: '123456' }))
    expect(res.status).toBe(500)
  })

  it('returns 429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true }))
    expect(res.status).toBe(429)
  })
})

// liveFake() plus a consumable token row scripted on the guests table.
function liveTokenFake(tokenRow: any = { id: 'g1' }) {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: LIVE } },
      guests: { update: { data: tokenRow } },
      rsvps: { insert: { data: { id: 'rsvp-1' } } },
      attendances: { insert: { data: { id: 'att-1' } } },
    },
  })
}

describe('POST /api/rsvp token gate', () => {
  it('rejects with 403 when the token is missing, and writes nothing', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true }))
    expect(res.status).toBe(403)
    // Gate must prevent any write reaching the DB.
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'rsvps')).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })

  it('rejects with 403 when the token does not match an unused row, and writes nothing', async () => {
    const fake = liveTokenFake(null) // update matched 0 rows
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true, token: '000000' }))
    expect(res.status).toBe(403)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'rsvps')).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'attendances')).toBe(false)
  })

  it('records the RSVP when a valid token is consumed', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true, token: '123456' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'rsvps')).toBe(true)
  })
})
