import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

// Storage is R2 now, but the RATE LIMITER is still Postgres-backed (rl_hit), so
// the Supabase admin mock has to stay — without it the 429 case can't be driven
// and enforceRateLimit would try to build a real client.
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/upload/r2', () => ({
  getObjectHead: vi.fn(),
  deleteObject: vi.fn(async () => {}),
  publicUrl: vi.fn((k: string) => `https://media.fincards.land/${k}`),
}))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getObjectHead, deleteObject } from '@/lib/upload/r2'
import { verifyOwnership } from '@/editor/lib/auth'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const mockHead = vi.mocked(getObjectHead)
const mockDelete = vi.mocked(deleteObject)
const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockAdmin.mockReturnValue(createFakeSupabase() as any)
  mockOwner.mockResolvedValue(OWNER)
  mockHead.mockResolvedValue(null) // object missing unless a test says otherwise
})

function verifyReq(body: any): Request {
  return new Request('http://localhost/api/upload/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
/** A 32-byte head buffer starting with `magic` (the file signature). */
function headOf(magic: number[], size = 1024) {
  const bytes = new Uint8Array(32)
  bytes.set(magic, 0)
  return { bytes, size }
}
const ID3 = [0x49, 0x44, 0x33] // "ID3" — MP3
const PNG = [0x89, 0x50, 0x4e, 0x47] // PNG magic
const GOOD_PATH = 'inv-1/1234-song.mp3'

describe('POST /api/upload/verify', () => {
  it('429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))).status).toBe(429)
  })

  it('400 when slug or path is missing', async () => {
    expect((await POST(verifyReq({ path: GOOD_PATH }))).status).toBe(400)
    expect((await POST(verifyReq({ slug: 'x' }))).status).toBe(400)
  })

  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))).status).toBe(403)
  })

  it('IDOR: 400 when the path is not under the owner\'s own folder', async () => {
    expect((await POST(verifyReq({ slug: 'x', path: 'other-inv/secret.mp3' }))).status).toBe(400)
    expect((await POST(verifyReq({ slug: 'x', path: 'inv-1/../other-inv/x.mp3' }))).status).toBe(400)
    // Crucially the rejected path must never reach a delete — that is the whole
    // point of the guard: an owner must not be able to erase someone else's media.
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('404 when the uploaded object is not in the bucket', async () => {
    mockHead.mockResolvedValue(null)
    expect((await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))).status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('SECURITY: 400 + deletes the object when the stored bytes are not real media', async () => {
    mockHead.mockResolvedValue(headOf([0, 1, 2, 3, 4, 5, 6, 7]))
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(400)
    // the bogus upload must be removed from storage
    expect(mockDelete).toHaveBeenCalledWith(GOOD_PATH)
  })

  it('SECURITY: 413 + deletes when the stored bytes exceed the size ceiling', async () => {
    // A valid-looking MP3 (ID3 header) whose REAL size is 13 MB — over the 12 MB
    // audio ceiling. The size R2 reports is what /verify must trust, not the
    // client's claim at /sign.
    mockHead.mockResolvedValue(headOf(ID3, 13 * 1024 * 1024))
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(413)
    expect(mockDelete).toHaveBeenCalledWith(GOOD_PATH)
  })

  it('200 + R2 public URL for a valid MP3 (ID3) upload', async () => {
    mockHead.mockResolvedValue(headOf(ID3))
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.url).toBe(`https://media.fincards.land/${GOOD_PATH}`)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('200 for a valid PNG upload', async () => {
    mockHead.mockResolvedValue(headOf(PNG))
    expect((await POST(verifyReq({ slug: 'x', path: 'inv-1/1234-photo.png' }))).status).toBe(200)
  })
})
