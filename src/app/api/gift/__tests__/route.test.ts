import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptField } from '@/lib/crypto/app'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
})

const LIVE = { id: 'inv-1', is_published: true, is_paid: true }
function post(body: any, raw = false) {
  return new Request('http://localhost/api/gift', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
function liveFake() {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: { invitations: { select: { data: LIVE } }, gift_confirmations: { insert: { data: {} } } },
  })
}

describe('POST /api/gift', () => {
  it('rejects invalid JSON with 400', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    expect((await POST(post('nope', true))).status).toBe(400)
  })

  it('rejects missing required fields with 400', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    expect((await POST(post({ guest_name: 'A', account_used: 'BCA' }))).status).toBe(400) // no slug
    expect((await POST(post({ slug: 'x', account_used: 'BCA' }))).status).toBe(400) // no name
    expect((await POST(post({ slug: 'x', guest_name: 'A' }))).status).toBe(400) // no account
  })

  it('returns 404 for unknown invitation, 403 for unpublished', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect((await POST(post({ slug: 'ghost', guest_name: 'A', account_used: 'BCA' }))).status).toBe(404)

    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { ...LIVE, is_paid: false } } } } }) as any,
    )
    expect((await POST(post({ slug: 'draft', guest_name: 'A', account_used: 'BCA' }))).status).toBe(403)
  })

  it('normalizes Indonesian thousand separators ("500.000" → 500000)', async () => {
    const fake = liveFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', account_used: 'BCA', amount: '500.000' }))
    expect(res.status).toBe(200)
    const insert = fake._calls.find((c) => c.kind === 'insert' && c.table === 'gift_confirmations')!
    // amount is encrypted at rest, but must decrypt back to the normalized integer string.
    expect(decryptField(insert.value.amount_enc)).toBe('500000')
  })

  it('rejects a non-numeric amount with 400', async () => {
    mockAdmin.mockReturnValue(liveFake() as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', account_used: 'BCA', amount: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('happy path: encrypts guest name but keeps account label as plaintext', async () => {
    const fake = liveFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'Siti Nurhaliza', account_used: 'BCA •••1234' }))
    expect(res.status).toBe(200)
    const insert = fake._calls.find((c) => c.kind === 'insert' && c.table === 'gift_confirmations')!
    expect(insert.value.guest_name_enc).not.toBe('Siti Nurhaliza')
    expect(decryptField(insert.value.guest_name_enc)).toBe('Siti Nurhaliza')
    expect(insert.value.account_used).toBe('BCA •••1234') // couple's own label, not PII
  })

  it('returns 500 on insert error and 429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: { invitations: { select: { data: LIVE } }, gift_confirmations: { insert: { error: { message: 'x' } } } },
      }) as any,
    )
    expect((await POST(post({ slug: 'x', guest_name: 'A', account_used: 'BCA' }))).status).toBe(500)

    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(post({ slug: 'x', guest_name: 'A', account_used: 'BCA' }))).status).toBe(429)
  })
})
