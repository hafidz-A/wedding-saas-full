import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../plans', () => ({ resolvePlan: vi.fn() }))
vi.mock('@/lib/email/receipt', () => ({ sendPaymentReceipt: vi.fn() }))
import { resolvePlan } from '../plans'
import { sendPaymentReceipt } from '@/lib/email/receipt'
import { extendActivePeriod, applyPaidQuotaAddon, applyPaidUpgrade, publishPaidInvitation } from '../publish'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

function fakeAdmin() {
  const calls: { value: any; col: string; val: unknown }[] = []
  const update = vi.fn((value: any) => ({
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ value, col, val })
      return Promise.resolve({ error: null })
    }),
  }))
  return { from: vi.fn(() => ({ update })), _calls: calls }
}

beforeEach(() => { vi.clearAllMocks() })

describe('extendActivePeriod', () => {
  it('sets a fresh expiry from the plan duration and republishes, without touching plan/is_paid', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'basic',
      amountIDR: 100000,
      expiresAt: (ms: number) => new Date(ms + 86_400_000).toISOString(),
    } as any)
    const admin = fakeAdmin()
    const now = 1_700_000_000_000
    await extendActivePeriod(admin as any, { id: 'inv-1', plan: 'basic', template_id: 'solary' }, now)

    expect(admin._calls).toHaveLength(1)
    expect(admin._calls[0].value.is_published).toBe(true)
    expect(admin._calls[0].value.expires_at).toBe(new Date(now + 86_400_000).toISOString())
    expect(admin._calls[0].value).not.toHaveProperty('is_paid')
    expect(admin._calls[0].value).not.toHaveProperty('plan')
    expect(admin._calls[0].col).toBe('id')
    expect(admin._calls[0].val).toBe('inv-1')
  })

  it('lifetime plan (null duration) clears expiry', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'premium',
      amountIDR: 200000,
      expiresAt: () => null,
    } as any)
    const admin = fakeAdmin()
    await extendActivePeriod(admin as any, { id: 'inv-2', plan: 'premium', template_id: 'solary' })
    expect(admin._calls[0].value.expires_at).toBeNull()
    expect(admin._calls[0].value.is_published).toBe(true)
  })
})

describe('publishPaidInvitation', () => {
  it('sends the initial receipt when paidSource is midtrans', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'basic',
      amountIDR: 100000,
      expiresAt: () => null,
    } as any)
    const admin = fakeAdmin()
    await publishPaidInvitation(
      admin as any,
      { id: 'inv-1', plan: 'basic', template_id: 'solary' },
      1_700_000_000_000,
      { paidSource: 'midtrans' },
    )
    expect(sendPaymentReceipt).toHaveBeenCalledWith(admin, 'inv-1', 'initial')
  })

  it('does not send a receipt for a comp/manual admin publish', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'basic',
      amountIDR: 100000,
      expiresAt: () => null,
    } as any)
    const admin = fakeAdmin()
    await publishPaidInvitation(
      admin as any,
      { id: 'inv-1', plan: 'basic', template_id: 'solary' },
      1_700_000_000_000,
      { paidSource: 'comp' },
    )
    expect(sendPaymentReceipt).not.toHaveBeenCalled()
  })
})

describe('applyPaidQuotaAddon', () => {
  it('calls the atomic increment RPC and marks the addon paid, untouching the invitation', async () => {
    const fake = createFakeSupabase({ tables: { quota_addons: { update: { data: { id: 'a1' } } } } })
    await applyPaidQuotaAddon(fake as any, { id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })

    const rpc = fake._calls.find((c) => c.kind === 'rpc')
    expect(rpc?.name).toBe('increment_guest_quota_extra')
    expect(rpc?.args).toEqual({ p_invitation_id: 'inv-1', p_qty: 100 })

    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'quota_addons')!
    expect(upd.value.status).toBe('paid')
    expect(upd.value.paid_at).toBeTruthy()
    // The invitation's plan / publish state must NOT be touched here.
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'invitations')).toBe(false)
  })
})

describe('payment writes that fail are never swallowed', () => {
  const plan = { planId: 'basic', amountIDR: 100000, expiresAt: () => null } as any
  const failing = () => createFakeSupabase({ default: { error: { message: 'db down' } } })

  it('publishPaidInvitation throws and sends no receipt', async () => {
    vi.mocked(resolvePlan).mockResolvedValue(plan)
    await expect(publishPaidInvitation(failing() as any, { id: 'i', plan: 'basic', template_id: 't' }, 1, { paidSource: 'midtrans' }))
      .rejects.toThrow()
    expect(sendPaymentReceipt).not.toHaveBeenCalled()
  })

  it('extendActivePeriod throws', async () => {
    vi.mocked(resolvePlan).mockResolvedValue(plan)
    await expect(extendActivePeriod(failing() as any, { id: 'i', plan: 'basic', template_id: 't' })).rejects.toThrow()
  })

  it('applyPaidUpgrade throws', async () => {
    vi.mocked(resolvePlan).mockResolvedValue(plan)
    await expect(applyPaidUpgrade(failing() as any, { id: 'u', invitation_id: 'i', to_plan: 'premium', template_id: 't' }))
      .rejects.toThrow()
  })
})

describe('applyPaidQuotaAddon can never add the same quota twice', () => {
  it('an addon already claimed (retry / race) does not increment again', async () => {
    const fake = createFakeSupabase({ tables: { quota_addons: { update: { data: null } } } })
    await applyPaidQuotaAddon(fake as any, { id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })
    expect(fake._calls.some((c) => c.kind === 'rpc')).toBe(false)
    expect(sendPaymentReceipt).not.toHaveBeenCalled()
  })

  it('a failed increment releases the claim and throws, so the retry applies it', async () => {
    const fake = createFakeSupabase({
      rpc: { increment_guest_quota_extra: { error: { message: 'db down' } } },
      tables: { quota_addons: { update: [{ data: { id: 'a1' } }, {}] } },
    })
    await expect(applyPaidQuotaAddon(fake as any, { id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })).rejects.toThrow()
    const updates = fake._calls.filter((c) => c.kind === 'update' && c.table === 'quota_addons')
    expect(updates.map((u) => u.value.status)).toEqual(['paid', 'pending'])
  })
})

