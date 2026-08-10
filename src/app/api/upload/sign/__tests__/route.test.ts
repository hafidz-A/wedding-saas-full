import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

// Storage is R2 now, but the RATE LIMITER is still Postgres-backed (rl_hit), so
// the Supabase admin mock has to stay — without it the 429 case can't be driven
// and enforceRateLimit would try to build a real client.
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/upload/r2', () => ({
  presignPut: vi.fn(
    async (key: string) => `https://acc.r2.cloudflarestorage.com/b/${key}?X-Amz-Signature=x`,
  ),
  sumPrefixBytes: vi.fn(async () => 0),
}))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { presignPut, sumPrefixBytes } from '@/lib/upload/r2'
import { verifyOwnership } from '@/editor/lib/auth'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockAdmin.mockReturnValue(createFakeSupabase() as any) // rate limit allowed
  mockOwner.mockResolvedValue(OWNER)
  vi.mocked(sumPrefixBytes).mockResolvedValue(0) // empty bucket prefix
  vi.mocked(presignPut).mockImplementation(
    async (key: string) => `https://acc.r2.cloudflarestorage.com/b/${key}?X-Amz-Signature=x`,
  )
})

function signReq(body: any): Request {
  return new Request('http://localhost/api/upload/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
const ok = { slug: 'x', filename: 'song.mp3', contentType: 'audio/mpeg', size: 6_000_000 }

describe('POST /api/upload/sign', () => {
  it('429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(signReq(ok))).status).toBe(429)
  })

  it('400 for a non-JSON body', async () => {
    expect((await POST(signReq('not json {'))).status).toBe(400)
  })

  it('400 when a required field is missing (filename is optional, defaults)', async () => {
    expect((await POST(signReq({ filename: 'a.mp3', contentType: 'audio/mpeg', size: 100 }))).status).toBe(400) // no slug
    expect((await POST(signReq({ slug: 'x', filename: 'a.mp3', size: 100 }))).status).toBe(400) // no contentType
    expect((await POST(signReq({ slug: 'x', filename: 'a.mp3', contentType: 'audio/mpeg' }))).status).toBe(400) // no size
    expect((await POST(signReq({ slug: 'x', filename: 'a.mp3', contentType: 'audio/mpeg', size: 0 }))).status).toBe(400) // size 0
  })

  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await POST(signReq(ok))).status).toBe(403)
  })

  it('400 for an unsupported mime type', async () => {
    expect((await POST(signReq({ ...ok, contentType: 'application/pdf' }))).status).toBe(400)
  })

  it('400 when the declared size exceeds the audio ceiling (12 MB)', async () => {
    expect((await POST(signReq({ ...ok, size: 13 * 1024 * 1024 }))).status).toBe(400)
  })

  it('400 when the declared size exceeds the image ceiling (5 MB)', async () => {
    expect(
      (await POST(signReq({ slug: 'x', filename: 'p.png', contentType: 'image/png', size: 6 * 1024 * 1024 }))).status,
    ).toBe(400)
  })

  it('413 when the per-invitation storage quota is exceeded', async () => {
    vi.mocked(sumPrefixBytes).mockResolvedValueOnce(300 * 1024 * 1024)
    expect((await POST(signReq(ok))).status).toBe(413)
  })

  it('scopes the quota lookup to the owning invitation folder', async () => {
    await POST(signReq(ok))
    expect(sumPrefixBytes).toHaveBeenCalledWith('inv-1/')
  })

  it('allows the upload when the quota lookup fails', async () => {
    vi.mocked(sumPrefixBytes).mockRejectedValueOnce(new Error('r2 down'))
    expect((await POST(signReq(ok))).status).toBe(200)
  })

  it('200 and returns a path scoped to the invitation folder + a presigned url', async () => {
    const res = await POST(signReq(ok))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.path).toMatch(/^inv-1\//) // path lives under the owner's own folder
    expect(json.url).toContain('X-Amz-Signature=')
    expect(json.token).toBeUndefined() // the Supabase token is gone
  })

  it('500 when R2 cannot be signed, without leaking the internal error', async () => {
    vi.mocked(presignPut).mockRejectedValueOnce(new Error('Missing R2_SECRET_ACCESS_KEY'))
    const res = await POST(signReq(ok))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toContain('R2_SECRET_ACCESS_KEY')
  })
})
