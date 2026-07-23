import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockAdmin.mockReturnValue(createFakeSupabase() as any)
  mockOwner.mockResolvedValue(OWNER)
})

function verifyReq(body: any): Request {
  return new Request('http://localhost/api/upload/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
/** A 32-byte Blob whose leading bytes are `head` (the file signature). */
function blobStarting(head: number[]): Blob {
  const u = new Uint8Array(32)
  u.set(head, 0)
  return new Blob([u])
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
  })

  it('404 when the uploaded object cannot be downloaded', async () => {
    // default fake: download() → { data: null } → treated as missing
    expect((await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))).status).toBe(404)
  })

  it('SECURITY: 400 + deletes the object when the stored bytes are not real media', async () => {
    const fake = createFakeSupabase({
      storage: { download: { data: blobStarting([0, 1, 2, 3, 4, 5, 6, 7]) } },
    })
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(400)
    // the bogus upload must be removed from storage
    const del = fake.lastCall('delete')
    expect(del?.value?.paths).toEqual([GOOD_PATH])
  })

  it('SECURITY: 413 + deletes when the stored bytes exceed the size ceiling', async () => {
    // A valid-looking MP3 (ID3 header) whose REAL size is 13 MB — over the 12 MB
    // audio ceiling. `size` is what /verify must trust, not the client's claim.
    const oversized: any = {
      size: 13 * 1024 * 1024,
      slice: (a: number, b: number) => blobStarting(ID3).slice(a, b),
    }
    const fake = createFakeSupabase({ storage: { download: { data: oversized } } })
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(413)
    expect(fake.lastCall('delete')?.value?.paths).toEqual([GOOD_PATH])
  })

  it('200 + public URL for a valid MP3 (ID3) upload', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        storage: { download: { data: blobStarting(ID3) }, publicUrl: 'https://cdn.test/inv-1/song.mp3' },
      }) as any,
    )
    const res = await POST(verifyReq({ slug: 'x', path: GOOD_PATH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.url).toContain('http')
  })

  it('200 for a valid PNG upload', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ storage: { download: { data: blobStarting(PNG) } } }) as any,
    )
    expect((await POST(verifyReq({ slug: 'x', path: 'inv-1/1234-photo.png' }))).status).toBe(200)
  })
})
