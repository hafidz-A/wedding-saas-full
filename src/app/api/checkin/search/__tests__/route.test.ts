import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptField as encGuest } from '@/lib/guests/crypto'
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
function search(body: any) {
  return new Request('http://localhost/api/checkin/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}
function fake(inv: any = INV) {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: inv } },
      guests: { select: { data: [{ id: 'g1', name_enc: encGuest('Budi Santoso') }] } },
      rsvps: { select: { data: [{ id: 'r1', guest_name_enc: encApp('Citra Dewi') }] } },
    },
  })
}

describe('POST /api/checkin/search', () => {
  it('429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))).status).toBe(429)
  })

  it('returns empty matches for a too-short query', async () => {
    mockAdmin.mockReturnValue(fake() as any)
    expect(await (await POST(search({ slug: 'x', token: TOKEN, q: 'bu' }))).json()).toEqual({ matches: [] })
  })

  it('SECURITY: a wrong token leaks NO names', async () => {
    mockAdmin.mockReturnValue(fake() as any)
    expect(await (await POST(search({ slug: 'x', token: 'WRONG-TOKEN', q: 'budi' }))).json()).toEqual({ matches: [] })
  })

  it('returns empty matches when the invitation is not live', async () => {
    mockAdmin.mockReturnValue(fake({ ...INV, is_published: false }) as any)
    expect(await (await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))).json()).toEqual({ matches: [] })
  })

  it('valid token returns a matching guest (decrypted, substring match)', async () => {
    mockAdmin.mockReturnValue(fake() as any)
    const { matches } = await (await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))).json()
    expect(matches.some((m: any) => m.id === 'g1' && m.kind === 'guest' && m.name === 'Budi Santoso')).toBe(true)
  })

  it('valid token also matches an RSVP name', async () => {
    mockAdmin.mockReturnValue(fake() as any)
    const { matches } = await (await POST(search({ slug: 'x', token: TOKEN, q: 'citra' }))).json()
    expect(matches.some((m: any) => m.id === 'r1')).toBe(true)
  })

  it('two invited guests with the same name both come back, with their labels', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: {
        invitations: { select: { data: INV } },
        guests: { select: { data: [
          { id: 'g1', name_enc: encGuest('Budi Santoso'), group_label: 'Keluarga Pria' },
          { id: 'g2', name_enc: encGuest('Budi Santoso'), group_label: 'Teman Kantor' },
        ] } },
        rsvps: { select: { data: [] } },
      },
    }) as any)
    const { matches } = await (await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))).json()
    expect(matches.map((m: any) => [m.id, m.label])).toEqual([['g1', 'Keluarga Pria'], ['g2', 'Teman Kantor']])
  })

  it('an RSVP already linked to its guest is listed once, as the guest', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: {
        invitations: { select: { data: INV } },
        guests: { select: { data: [
          { id: 'g1', name_enc: encGuest('Budi Santoso'), group_label: 'A' },
          { id: 'g2', name_enc: encGuest('Budi Santoso'), group_label: 'B' },
        ] } },
        rsvps: { select: { data: [{ id: 'r1', guest_name_enc: encApp('Budi Santoso') }] } },
        attendances: { select: { data: [{ rsvp_id: 'r1' }] } },
      },
    }) as any)
    const { matches } = await (await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))).json()
    expect(matches.map((m: any) => m.id)).toEqual(['g1', 'g2'])
  })

  it('an outage is a 500, never an empty "not found" list', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: {
        invitations: { select: { data: INV } },
        guests: { select: { error: { message: 'down' } } },
        rsvps: { select: { data: [] } },
      },
    }) as any)
    const res = await POST(search({ slug: 'x', token: TOKEN, q: 'budi' }))
    expect(res.status).toBe(500)
    expect((await res.json()).matches).toBeUndefined()
  })

  it('SECURITY: an outage response carries no names even with a valid token', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      rpc: { rl_hit: { data: true } },
      tables: { invitations: { select: { error: { message: 'down' } } } },
    }) as any)
    const body = JSON.stringify(await (await POST(search({ slug: 'x', token: 'WRONG', q: 'budi' }))).json())
    expect(body).not.toContain('Budi')
  })
})

