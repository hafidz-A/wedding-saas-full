import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { DELETE } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
beforeEach(() => {
  vi.clearAllMocks()
})

const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
function del(slug: string | null, id = 'note-1') {
  const url = slug === null ? 'http://localhost/api/guestbook/note-1' : `http://localhost/api/guestbook/note-1?slug=${slug}`
  return [new Request(url, { method: 'DELETE' }), { params: { id } }] as const
}

describe('DELETE /api/guestbook/[id]', () => {
  it('400 when slug missing', async () => {
    const [req, ctx] = del(null)
    expect((await DELETE(req, ctx)).status).toBe(400)
  })

  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    const [req, ctx] = del('rizky-amara')
    expect((await DELETE(req, ctx)).status).toBe(403)
  })

  it('404 when the note does not exist', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { guestbook_notes: { select: { data: null } } } }) as any)
    const [req, ctx] = del('rizky-amara')
    expect((await DELETE(req, ctx)).status).toBe(404)
  })

  it('403 when the note belongs to ANOTHER invitation (cross-tenant guard)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { guestbook_notes: { select: { data: { invitation_id: 'OTHER-inv' } } } } }) as any,
    )
    const [req, ctx] = del('rizky-amara')
    expect((await DELETE(req, ctx)).status).toBe(403)
  })

  it('deletes when the note belongs to the owner', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = createFakeSupabase({ tables: { guestbook_notes: { select: { data: { invitation_id: 'inv-1' } }, delete: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const [req, ctx] = del('rizky-amara')
    expect((await DELETE(req, ctx)).status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'delete' && c.table === 'guestbook_notes')).toBe(true)
  })
})
