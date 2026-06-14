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
  return new Request('http://localhost/api/invitation/rizky-amara/music', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('PUT /api/invitation/[slug]/music', () => {
  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await PUT(put({ music: null }), ctx)).status).toBe(403)
  })

  it('404 when the row is missing', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect((await PUT(put({ music: null }), ctx)).status).toBe(404)
  })

  it('music:null removes the music key from config', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: { config: { music: { url: 'old' }, meta: {} } } }, update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ music: null }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect('music' in upd.value.config).toBe(false) // cleared
    expect(upd.value.config.meta).toBeDefined() // other keys preserved
  })

  it('sanitizes a music object and applies defaults', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: { config: {} } }, update: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ music: { url: '  https://cdn/x.mp3  ' } }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.music.url).toBe('https://cdn/x.mp3') // trimmed
    expect(upd.value.config.music.enabled).toBe(true) // default
    expect(upd.value.config.music.acceptLabel).toBe('Putar') // default label
  })

  it('500 when the update fails', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: {} } }, update: { error: { message: 'x' } } } } }) as any,
    )
    expect((await PUT(put({ music: null }), ctx)).status).toBe(500)
  })
})
