import { describe, it, expect, vi } from 'vitest'
import { renderAdminAction, logAdminAction } from '../log'

const insert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: () => ({ insert }) }),
}))

describe('renderAdminAction', () => {
  it('renders a plain Indonesian sentence per known action', () => {
    expect(renderAdminAction({ action: 'refund.approve', target_id: 'inv-1' }))
      .toContain('Menyetujui refund')
    expect(renderAdminAction({ action: 'unknown.thing', target_id: null }))
      .toContain('unknown.thing')
  })
})

describe('logAdminAction', () => {
  it('inserts one admin_actions row', async () => {
    await logAdminAction('boss@x.com', { action: 'invitation.comp', targetId: 'inv-1' })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_email: 'boss@x.com', action: 'invitation.comp', target_id: 'inv-1',
    }))
  })
})
