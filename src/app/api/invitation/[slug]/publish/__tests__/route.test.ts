import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
beforeEach(() => {
  vi.clearAllMocks()
})

const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
const ctx = { params: { slug: 'adi-rani' } }
function put(body: any, raw = false) {
  return new Request('http://localhost/api/invitation/adi-rani/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/invitation/[slug]/publish', () => {
  it('returns 403 when not the owner (auth gate)', async () => {
    mockOwner.mockResolvedValue(null)
    const res = await POST(put({ is_published: true }), ctx)
    expect(res.status).toBe(403)
    // must NOT touch the DB when unauthorized
    expect(mockAdmin).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON and non-boolean is_published with 400', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { update: {} } } }) as any)
    expect((await POST(put('x', true), ctx)).status).toBe(400)
    expect((await POST(put({ is_published: 'yes' }), ctx)).status).toBe(400)
    expect((await POST(put({}), ctx)).status).toBe(400)
  })

  it('flips the flag and echoes it on success', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = createFakeSupabase({ tables: { invitations: { update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(put({ is_published: false }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, is_published: false })
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.is_published).toBe(false)
  })

  it('returns 500 on DB error', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { update: { error: { message: 'x' } } } } }) as any,
    )
    expect((await POST(put({ is_published: true }), ctx)).status).toBe(500)
  })
})
