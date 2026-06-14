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
  mockAdmin.mockReturnValue(createFakeSupabase() as any) // rate limit allowed, empty storage
  mockOwner.mockResolvedValue(OWNER)
})

/** A real PNG (valid magic bytes), padded to `size` bytes. */
function pngFile(size = 64): File {
  const b = new Uint8Array(Math.max(8, size))
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  return new File([b], 'photo.png', { type: 'image/png' })
}
function form(parts: { slug?: string; file?: File }): Request {
  const fd = new FormData()
  if (parts.slug !== undefined) fd.append('slug', parts.slug)
  if (parts.file) fd.append('file', parts.file)
  return new Request('http://localhost/api/upload', { method: 'POST', body: fd })
}

describe('POST /api/upload', () => {
  it('429 when rate-limited', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ rpc: { rl_hit: { data: false } } }) as any)
    expect((await POST(form({ slug: 'x', file: pngFile() }))).status).toBe(429)
  })

  it('400 for a non-multipart body', async () => {
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('400 when slug or file is missing', async () => {
    expect((await POST(form({ file: pngFile() }))).status).toBe(400)
    expect((await POST(form({ slug: 'x' }))).status).toBe(400)
  })

  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await POST(form({ slug: 'x', file: pngFile() }))).status).toBe(403)
  })

  it('400 for an unsupported mime type', async () => {
    const pdf = new File([new Uint8Array([1, 2, 3, 4])], 'doc.pdf', { type: 'application/pdf' })
    expect((await POST(form({ slug: 'x', file: pdf }))).status).toBe(400)
  })

  it('SECURITY: 400 when bytes do not match the declared image type (magic-byte guard)', async () => {
    const liar = new File([new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])], 'fake.png', { type: 'image/png' })
    expect((await POST(form({ slug: 'x', file: liar }))).status).toBe(400)
  })

  it('413 when the per-invitation storage quota is exceeded', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ storage: { list: { data: [{ metadata: { size: 300 * 1024 * 1024 } }] } } }) as any,
    )
    expect((await POST(form({ slug: 'x', file: pngFile() }))).status).toBe(413)
  })

  it('200 and returns a public URL on a valid PNG upload', async () => {
    mockAdmin.mockReturnValue(
      createFakeSupabase({ storage: { publicUrl: 'https://cdn.test/inv-1/photo.png' } }) as any,
    )
    const res = await POST(form({ slug: 'x', file: pngFile() }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.url).toContain('http')
  })
})
