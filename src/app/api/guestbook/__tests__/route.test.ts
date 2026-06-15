import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  // hashToken (consumeGuestToken) reads this; required for the token-gate path.
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
})

const LIVE = { id: 'inv-1', is_published: true, is_paid: true }
let ipCounter = 0
function post(body: any, raw = false) {
  // Unique IP per call so the in-memory 30s soft-limit never bleeds across tests.
  return new Request('http://localhost/api/guestbook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ipCounter++}` },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
function liveFake() {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: LIVE } },
      guests: { update: { data: { id: 'g1' } } },
      guestbook_notes: { insert: { data: { id: 'n1', guest_name_enc: null, message_enc: null, color: 'gold', created_at: 't' } } },
    },
  })
}
function liveNoteFake(tokenRow: any = { id: 'g1' }) {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: { id: 'inv-1', is_published: true, is_paid: true } } },
      guests: { update: { data: tokenRow } },
      guestbook_notes: { insert: { data: { id: 'n1', guest_name_enc: null, message_enc: null, color: 'gold', created_at: 't' } } },
    },
  })
}

describe('POST /api/guestbook', () => {
  it('429 when cross-instance rate limit trips', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(post({ slug: 'x', name: 'A', message: 'hi' }))).status).toBe(429)
  })

  it('400 for invalid JSON / missing slug', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    expect((await POST(post('x', true))).status).toBe(400)
    expect((await POST(post({ name: 'A', message: 'hi' }))).status).toBe(400)
  })

  it('400 for name/message length violations', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    expect((await POST(post({ slug: 'a', name: '', message: 'hi' }))).status).toBe(400)
    expect((await POST(post({ slug: 'b', name: 'x'.repeat(41), message: 'hi' }))).status).toBe(400)
    expect((await POST(post({ slug: 'c', name: 'A', message: '' }))).status).toBe(400)
    expect((await POST(post({ slug: 'd', name: 'A', message: 'x'.repeat(241) }))).status).toBe(400)
  })

  it('404 when invitation is missing / not live', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: true } }, tables: { invitations: { select: { data: null } } } }) as any)
    expect((await POST(post({ slug: 'ghost', name: 'A', message: 'hi' }))).status).toBe(404)
  })

  it('happy path: encrypts at rest, returns decrypted note, coerces unknown color to gold', async () => {
    const fake = liveFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'live1', name: 'Rina', message: 'Selamat ya!', color: 'rainbow', token: '123456' }))
    expect(res.status).toBe(200)
    const insert = fake._calls.find((c) => c.kind === 'insert' && c.table === 'guestbook_notes')!
    expect(insert.value.guest_name_enc).not.toBe('Rina') // encrypted at rest
    expect(insert.value.message_enc).not.toBe('Selamat ya!')
    expect(insert.value.color).toBe('gold') // 'rainbow' not allowed → default
    expect(insert.value.is_approved).toBe(true)
  })

  it('soft per-(slug,IP) limit: a second immediate submit returns 429', async () => {
    const fake = liveFake()
    mockAdmin.mockReturnValue(fake as any)
    const ip = '198.51.100.77'
    const mk = (msg: string) =>
      new Request('http://localhost/api/guestbook', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ slug: 'samewindow', name: 'A', message: msg, token: '123456' }),
      })
    expect((await POST(mk('first'))).status).toBe(200)
    expect((await POST(mk('second'))).status).toBe(429)
  })
})

describe('POST /api/guestbook token gate', () => {
  it('rejects with 403 when token missing, and writes no note', async () => {
    const fake = liveNoteFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x1', name: 'A', message: 'hai' }))
    expect(res.status).toBe(403)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guestbook_notes')).toBe(false)
  })

  it('rejects with 403 when token does not match an unused row', async () => {
    const fake = liveNoteFake(null)
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x2', name: 'A', message: 'hai', token: '000000' }))
    expect(res.status).toBe(403)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guestbook_notes')).toBe(false)
  })

  it('inserts the note when a valid token is consumed', async () => {
    const fake = liveNoteFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x3', name: 'A', message: 'hai', token: '123456' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guestbook_notes')).toBe(true)
  })
})
