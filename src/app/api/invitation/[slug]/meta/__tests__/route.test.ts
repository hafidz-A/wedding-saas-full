import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { PUT } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
beforeEach(() => {
  vi.clearAllMocks()
})

const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
const ctx = { params: { slug: 'rizky-amara' } }
function put(body: any, raw = false) {
  return new Request('http://localhost/api/invitation/rizky-amara/meta', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
function rowFake() {
  return createFakeSupabase({ tables: { invitations: { select: { data: { config: { meta: {} } } }, update: {} } } })
}

describe('PUT /api/invitation/[slug]/meta', () => {
  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await PUT(put({ title: 'Hi' }), ctx)).status).toBe(403)
  })

  it('400 for invalid JSON and nothing-to-update', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(rowFake() as any)
    expect((await PUT(put('x', true), ctx)).status).toBe(400)
    expect((await PUT(put({}), ctx)).status).toBe(400)
  })

  it('400 for an ogImage that is not an http(s) URL', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(rowFake() as any)
    expect((await PUT(put({ ogImage: 'javascript:alert(1)' }), ctx)).status).toBe(400)
  })

  it('normalizes whitespace and saves the title', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ title: '  Amara   &   Rizky  ' }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.meta.title).toBe('Amara & Rizky')
  })

  it('an empty-string field clears the value', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    await PUT(put({ description: '' }), ctx)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.meta.description).toBe('')
  })

  it('404 when the row is missing', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect((await PUT(put({ title: 'Hi' }), ctx)).status).toBe(404)
  })
})
