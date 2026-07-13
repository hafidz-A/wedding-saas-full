import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
vi.mock('@/lib/config/palette-allowlist', () => ({ isPaletteAllowedForTemplate: vi.fn(() => true) }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'
import { PUT } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
const mockPalette = vi.mocked(isPaletteAllowedForTemplate)
beforeEach(() => {
  vi.clearAllMocks()
  mockPalette.mockReturnValue(true)
})

const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
const ctx = { params: { slug: 'adi-rani' } }
function put(body: any, raw = false) {
  return new Request('http://localhost/api/invitation/adi-rani/theme', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
function rowFake() {
  return createFakeSupabase({
    tables: { invitations: { select: { data: { config: { theme: {} }, template_id: 'lovebirds' } }, update: {} } },
  })
}

describe('PUT /api/invitation/[slug]/theme', () => {
  it('403 when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    expect((await PUT(put({ defaultPalette: 'gold' }), ctx)).status).toBe(403)
  })

  it('400 for invalid JSON / nothing-to-update / invalid ornament', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(rowFake() as any)
    expect((await PUT(put('x', true), ctx)).status).toBe(400)
    expect((await PUT(put({}), ctx)).status).toBe(400) // nothing to update
    expect((await PUT(put({ ornamentType: 'dragons' }), ctx)).status).toBe(400) // not in allowlist
  })

  it('404 when the row is missing', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect((await PUT(put({ defaultPalette: 'gold' }), ctx)).status).toBe(404)
  })

  it('400 when palette is not allowed for the template', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(rowFake() as any)
    mockPalette.mockReturnValue(false)
    expect((await PUT(put({ defaultPalette: 'neon-pink' }), ctx)).status).toBe(400)
  })

  it('saves palette into config.theme.defaultPalette', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ defaultPalette: 'emerald' }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.theme.defaultPalette).toBe('emerald')
  })

  it('saves a valid ornamentType', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ ornamentType: 'butterflies' }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.theme.ornamentType).toBe('butterflies')
  })
})
