import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/admin/is-admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/admin/log', () => ({ logAdminAction: vi.fn() }))
vi.mock('@/lib/admin/revalidate', () => ({ revalidateInvitation: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { adminSetAppearance } from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockLog = vi.mocked(logAdminAction)
const mockRevalidate = vi.mocked(revalidateInvitation)

const ADMIN = { email: 'admin@fincards.land' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue(ADMIN)
})

describe('adminSetAppearance', () => {
  it('rejects when the caller is not an admin (guard chain)', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('not-admin'))
    const r = await adminSetAppearance('inv-1', { palette: 'warmCream' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/akses ditolak/i)
    expect(mockAdmin).not.toHaveBeenCalled()
  })

  it('rejects when neither palette nor ornamentType is supplied', async () => {
    const r = await adminSetAppearance('inv-1', {})
    expect(r.ok).toBe(false)
  })

  it('rejects when the invitation row is missing', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    const r = await adminSetAppearance('inv-1', { palette: 'warmCream' })
    expect(r.ok).toBe(false)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('rejects an ornament that is not valid for Solary (known template, empty list)', async () => {
    const fake = createFakeSupabase({
      tables: { invitations: { select: { data: { config: { theme: {} }, template_id: 'solary' } } } },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await adminSetAppearance('inv-1', { ornamentType: 'birds' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/tidak valid/i)
    expect(fake._calls.some((c) => c.kind === 'update')).toBe(false)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('rejects a palette that is not in the allowlist for the template', async () => {
    const fake = createFakeSupabase({
      tables: { invitations: { select: { data: { config: { theme: {} }, template_id: 'lovebirds' } } } },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await adminSetAppearance('inv-1', { palette: 'neon-pink-not-real' })
    expect(r.ok).toBe(false)
  })

  it('valid save merges config.theme WITHOUT dropping sibling config keys, and audits the action', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              template_id: 'lovebirds',
              config: {
                sections: [{ type: 'hero', props: { coupleName: 'Adi & Rani' } }],
                theme: { defaultPalette: 'warmCream', someOtherThemeKey: 'keep-me' },
                meta: { titleSuffix: 'Our Wedding' },
              },
            },
          },
          update: {},
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)

    const r = await adminSetAppearance('inv-1', { palette: 'emeraldGarden', ornamentType: 'butterflies' })
    expect(r.ok).toBe(true)

    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.sections).toEqual([{ type: 'hero', props: { coupleName: 'Adi & Rani' } }])
    expect(upd.value.config.meta).toEqual({ titleSuffix: 'Our Wedding' })
    expect(upd.value.config.theme).toEqual({
      defaultPalette: 'emeraldGarden',
      someOtherThemeKey: 'keep-me',
      ornamentType: 'butterflies',
    })
    expect(typeof upd.value.updated_at).toBe('string')

    expect(mockLog).toHaveBeenCalledWith(ADMIN.email, expect.objectContaining({
      action: 'invitation.set_appearance',
      targetType: 'invitation',
      targetId: 'inv-1',
      meta: { palette: 'emeraldGarden', ornamentType: 'butterflies' },
    }))
    expect(mockRevalidate).toHaveBeenCalledOnce()
  })

  it('allows updating only the ornament, leaving the existing palette untouched', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: { data: { template_id: 'lovebirds', config: { theme: { defaultPalette: 'darkLuxury' } } } },
          update: {},
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)

    const r = await adminSetAppearance('inv-1', { ornamentType: 'perched' })
    expect(r.ok).toBe(true)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.theme).toEqual({ defaultPalette: 'darkLuxury', ornamentType: 'perched' })
  })
})
