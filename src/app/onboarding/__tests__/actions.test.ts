import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => ({ auth: { getUser } }) }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn(), resolveUpgrade: vi.fn(), planBaseQuota: vi.fn(() => 200) }))
vi.mock('@/lib/payments/template-plans', () => ({ getTemplatePlans: vi.fn(async () => []) }))
vi.mock('@/lib/payments/gateway', () => ({
  createSnapTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  isPaidStatus: vi.fn(),
  expireTransaction: vi.fn(),
  mintOrderId: (p: string, id: string, now = Date.now()) => `${p}_${id}_${now.toString(36)}`,
  canApiRefund: (c: string | null | undefined) => !!c && ['credit_card','gopay','shopeepay','dana','ovo','qris','kredivo','akulaku'].includes(c),
}))
vi.mock('@/lib/payments/publish', () => ({
  publishPaidInvitation: vi.fn(), applyPaidUpgrade: vi.fn(), applyPaidQuotaAddon: vi.fn(), extendActivePeriod: vi.fn(),
}))
vi.mock('@/lib/crypto/app', () => ({ encryptField: vi.fn((s: string | null | undefined) => (s == null ? null : `enc:${s}`)) }))
vi.mock('@/lib/payments/refund-usage', () => ({
  buildUsageSnapshot: vi.fn(async () => ({
    is_published: false, guest_count: 0, rsvp_count: 0, attendance_count: 0,
    config_edited: false, days_since_paid: 0, ever_used: false, days_since_published: null,
  })),
}))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolvePlan } from '@/lib/payments/plans'
import { createSnapTransaction, getTransactionStatus, isPaidStatus } from '@/lib/payments/gateway'
import { publishPaidInvitation, applyPaidUpgrade, applyPaidQuotaAddon, extendActivePeriod } from '@/lib/payments/publish'
import {
  completeOnboarding, checkSlugAvailable, startCheckout, recheckPayment, startQuotaAddonCheckout,
  recheckRenewal, recheckUpgrade, recheckQuotaAddon, requestRefund, startRenewal, startUpgradeCheckout,
} from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockResolvePlan = vi.mocked(resolvePlan)
const mockCreateInvoice = vi.mocked(createSnapTransaction)
const mockGetInvoice = vi.mocked(getTransactionStatus)
const mockIsPaid = vi.mocked(isPaidStatus)
const mockPublish = vi.mocked(publishPaidInvitation)
const mockApplyUpgrade = vi.mocked(applyPaidUpgrade)
const mockApplyAddon = vi.mocked(applyPaidQuotaAddon)
const mockExtend = vi.mocked(extendActivePeriod)

const USER = { id: 'user-1', email: 'u@example.com' }
beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: USER } })
  mockResolvePlan.mockResolvedValue({ amountIDR: 100000 } as any)
  mockIsPaid.mockReturnValue(true)
  mockAdmin.mockReturnValue(createFakeSupabase() as any)
})

function input(over: Partial<Record<string, string>> = {}) {
  return {
    slug: 'adi-rani',
    template: 'lovebirds',
    plan: 'premium',
    brideName: 'Rani Sastrawijaya',
    groomName: 'Adi Pratama',
    weddingDate: '2026-11-15T16:00:00',
    venue: 'The Grand Ballroom',
    ...over,
  } as any
}

describe('completeOnboarding', () => {
  it('fails without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect((await completeOnboarding(input())).ok).toBe(false)
  })

  it('rejects an invalid slug / missing names / bad date', async () => {
    expect((await completeOnboarding(input({ slug: 'ab' }))).ok).toBe(false)
    expect((await completeOnboarding(input({ brideName: '  ' }))).ok).toBe(false)
    expect((await completeOnboarding(input({ venue: '' }))).ok).toBe(false)
    expect((await completeOnboarding(input({ weddingDate: 'not-a-date' }))).ok).toBe(false)
  })

  it('rejects a taken slug', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { id: 'taken' } } } } }) as any)
    const r = await completeOnboarding(input())
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/sudah dipakai/i)
  })

  it('caps unpaid drafts (anti-abuse)', async () => {
    // 1st select = slug check (free), 2nd select = draft count (at the cap).
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: [{ data: null }, { count: 10 }] } } }) as any,
    )
    const r = await completeOnboarding(input())
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/belum dibayar/i)
  })

  it('creates an UNPAID DRAFT on the happy path', async () => {
    const fake = createFakeSupabase({
      tables: { invitations: { select: [{ data: null }, { count: 0 }], insert: { data: { id: 'inv-9' } } } },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await completeOnboarding(input())
    expect(r.ok).toBe(true)
    expect(r.invitationId).toBe('inv-9')
    expect(r.publicUrl).toBe('/lovebirds/adi-rani')
    expect(r.dashboardUrl).toBe('/lovebirds/adi-rani/dashboard')
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'invitations')!
    expect(ins.value.is_paid).toBe(false)
    expect(ins.value.is_published).toBe(false)
    expect(ins.value.owner_user_id).toBe('user-1')
    expect(ins.value.template_id).toBe('lovebirds')
  })

  it('stores the chosen guest quota add-on, snapped UP to a clean block', async () => {
    const fake = createFakeSupabase({
      tables: { invitations: { select: [{ data: null }, { count: 0 }], insert: { data: { id: 'inv-9' } } } },
    })
    mockAdmin.mockReturnValue(fake as any)
    // premium base 500; 137 -> ceil to 150, within [0, 5000-500].
    await completeOnboarding(input({ guestQuotaExtra: 137 } as any))
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'invitations')!
    expect(ins.value.guest_quota_extra).toBe(150)
  })
})

describe('checkSlugAvailable', () => {
  it('available when free', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect(await checkSlugAvailable('adi-rani')).toEqual({ available: true })
  })
  it('unavailable when taken', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { id: 'x' } } } } }) as any)
    expect((await checkSlugAvailable('adi-rani')).available).toBe(false)
  })
  it('rejects an invalid format without hitting the DB', async () => {
    expect((await checkSlugAvailable('a')).available).toBe(false)
  })
})

describe('startCheckout', () => {
  const INV = { id: 'inv-1', slug: 'x', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1', email: 'e@x.com', is_paid: false, gateway_order_id: null }

  it('fails without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect((await startCheckout('inv-1')).ok).toBe(false)
  })

  it('rejects a foreign / already-paid invitation', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...INV, owner_user_id: 'someone-else' } } } } }) as any)
    expect((await startCheckout('inv-1')).ok).toBe(false)

    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...INV, is_paid: true } } } } }) as any)
    expect((await startCheckout('inv-1')).ok).toBe(false)
  })

  it('creates a transaction and returns the hosted URL', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV }, update: {} } } }) as any)
    mockCreateInvoice.mockResolvedValue({ token: 't', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/xyz' } as any)
    const r = await startCheckout('inv-1')
    expect(r.ok).toBe(true)
    expect(r.invoiceUrl).toBe('https://app.sandbox.midtrans.com/snap/v2/vtweb/xyz')
  })

  it('charges plan price + guest-quota add-on', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...INV, guest_quota_extra: 100 } }, update: {} } } }) as any)
    mockResolvePlan.mockResolvedValue({ amountIDR: 100000 } as any)
    mockCreateInvoice.mockResolvedValue({ token: 't', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/xyz' } as any)
    await startCheckout('inv-1')
    // 100000 plan + 2 blocks * 10000 = 120000
    expect(mockCreateInvoice.mock.calls[0][0]).toMatchObject({ amountIDR: 120000 })
  })
})

describe('startQuotaAddonCheckout', () => {
  const PAID = { id: 'inv-1', slug: 'x', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1', email: 'e@x.com', is_paid: true, guest_quota_extra: 0 }

  it('rejects an unpaid invitation', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...PAID, is_paid: false } } } } }) as any)
    expect((await startQuotaAddonCheckout('inv-1', 100)).ok).toBe(false)
  })

  it('inserts a pending quota_addons row + qta_ transaction for the right amount', async () => {
    const fake = createFakeSupabase({ tables: { invitations: { select: { data: PAID } }, quota_addons: { insert: {} } } })
    mockAdmin.mockReturnValue(fake as any)
    mockCreateInvoice.mockResolvedValue({ token: 't', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/xyz' } as any)
    const r = await startQuotaAddonCheckout('inv-1', 100)
    expect(r.ok).toBe(true)
    expect(mockCreateInvoice.mock.calls[0][0]).toMatchObject({ amountIDR: 20000 })
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'quota_addons')!
    expect(ins.value.qty_guests).toBe(100)
    expect(ins.value.amount_idr).toBe(20000)
    expect(ins.value.status).toBe('pending')
    expect(ins.value.gateway_txn_id).toBe(null)
    expect(String(ins.value.gateway_order_id)).toMatch(/^qta_/)
  })

  it('rejects when the purchase would exceed the 5000 cap', async () => {
    // base 200 (mocked) + extra 4750 = 4950 effective; +100 -> 5050 > 5000.
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...PAID, guest_quota_extra: 4750 } } } } }) as any)
    const r = await startQuotaAddonCheckout('inv-1', 100)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/5000|sisa/i)
  })
})

describe('recheckPayment', () => {
  const INV = { id: 'inv-1', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1', is_paid: false, gateway_order_id: 'inv_inv-1_abc' }

  it('returns early when already paid', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...INV, is_paid: true } } } } }) as any)
    expect(await recheckPayment('inv-1')).toMatchObject({ ok: true, published: true })
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes when Midtrans confirms paid for the right amount', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockGetInvoice.mockResolvedValue({ orderId: INV.gateway_order_id, transactionId: 'mid-1', status: 'settlement', fraudStatus: null, grossAmountIDR: 100000, paymentType: 'qris' } as any)
    const r = await recheckPayment('inv-1')
    expect(r).toMatchObject({ ok: true, published: true })
    expect(mockPublish).toHaveBeenCalledOnce()
    expect(mockPublish.mock.calls[0][3]).toEqual(expect.objectContaining({
      paidAmountIDR: 100000, paidSource: 'midtrans', feeIDR: null,
      paidChannel: 'qris', gatewayTxnId: 'mid-1',
    }))
  })

  it('does NOT publish when the transaction is still unpaid', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockIsPaid.mockReturnValue(false)
    mockGetInvoice.mockResolvedValue({ orderId: INV.gateway_order_id, transactionId: null, status: 'pending', fraudStatus: null, grossAmountIDR: 100000, paymentType: null } as any)
    const r = await recheckPayment('inv-1')
    expect(r).toMatchObject({ ok: true, published: false })
    expect(mockPublish).not.toHaveBeenCalled()
  })
})

describe('recheckRenewal', () => {
  const INV = {
    id: 'inv-1', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1',
    is_paid: true, expires_at: '2020-01-01T00:00:00Z', gateway_order_id: 'ren_inv-1_abc',
  }

  it('extends the active period when Midtrans confirms paid for the current plan price', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockGetInvoice.mockResolvedValue({ orderId: INV.gateway_order_id, transactionId: 'mid-2', status: 'settlement', fraudStatus: null, grossAmountIDR: 100000, paymentType: 'qris' } as any)
    const r = await recheckRenewal('inv-1')
    expect(r).toMatchObject({ ok: true, published: true })
    expect(mockExtend).toHaveBeenCalledOnce()
    expect(mockExtend.mock.calls[0][1]).toEqual(INV)
  })

  it('does NOT extend when the re-fetched amount mismatches the plan price', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockGetInvoice.mockResolvedValue({ orderId: INV.gateway_order_id, transactionId: 'mid-2', status: 'settlement', fraudStatus: null, grossAmountIDR: 50000, paymentType: 'qris' } as any)
    const r = await recheckRenewal('inv-1')
    expect(r).toMatchObject({ ok: true, published: false })
    expect(mockExtend).not.toHaveBeenCalled()
  })
})

describe('recheckUpgrade', () => {
  const INV = { id: 'inv-1', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1' }
  const UPG = { id: 'u1', invitation_id: 'inv-1', to_plan: 'premium', amount_idr: 50000, gateway_order_id: 'upg_inv-1_abc', status: 'pending' }

  it('applies the pending upgrade when Midtrans confirms paid for the right amount', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      tables: { invitations: { select: { data: INV } }, plan_upgrades: { select: { data: UPG } } },
    }) as any)
    mockGetInvoice.mockResolvedValue({ orderId: UPG.gateway_order_id, transactionId: 'mid-3', status: 'settlement', fraudStatus: null, grossAmountIDR: 50000, paymentType: 'gopay' } as any)
    const r = await recheckUpgrade('inv-1')
    expect(r).toMatchObject({ ok: true, published: true })
    expect(mockApplyUpgrade).toHaveBeenCalledOnce()
    expect(mockApplyUpgrade.mock.calls[0][1]).toEqual({ id: 'u1', invitation_id: 'inv-1', to_plan: 'premium', template_id: 'lovebirds' })
  })
})

describe('recheckQuotaAddon', () => {
  const INV = { id: 'inv-1', owner_user_id: 'user-1' }
  const ADDON = { id: 'a1', invitation_id: 'inv-1', qty_guests: 100, amount_idr: 20000, gateway_order_id: 'qta_inv-1_abc', status: 'pending' }

  it('applies the pending addon when Midtrans confirms paid for the recorded amount', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      tables: { invitations: { select: { data: INV } }, quota_addons: { select: { data: ADDON } } },
    }) as any)
    mockGetInvoice.mockResolvedValue({ orderId: ADDON.gateway_order_id, transactionId: 'mid-4', status: 'settlement', fraudStatus: null, grossAmountIDR: 20000, paymentType: 'qris' } as any)
    const r = await recheckQuotaAddon('inv-1')
    expect(r).toMatchObject({ ok: true, published: true })
    expect(mockApplyAddon).toHaveBeenCalledOnce()
    expect(mockApplyAddon.mock.calls[0][1]).toEqual({ id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })
  })
})

describe('requestRefund', () => {
  const INV = {
    id: 'inv-1', owner_user_id: 'user-1', is_paid: true, paid_source: 'midtrans', paid_channel: 'bank_transfer',
    paid_at: null, is_published: false, updated_at: null, used_at: null, published_at: null,
  }

  it('requires a destination for a midtrans bank_transfer payment (no API refund)', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      tables: { invitations: { select: { data: INV } }, refund_requests: { select: { data: [] } } },
    }) as any)
    const r = await requestRefund('inv-1', { category: 'other' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Isi bank/i)
  })

  it('does NOT require a destination for a midtrans qris payment (API-refundable)', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { ...INV, paid_channel: 'qris' } } },
        refund_requests: { select: { data: [] }, insert: {} },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await requestRefund('inv-1', { category: 'other' })
    expect(r.ok).toBe(true)
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'refund_requests')!
    expect(ins.value.usage_snapshot.destination).toBeNull()
  })
})

/**
 * Suspension is enforced server-side, not only in the UI. /profile withholds these
 * CTAs, but a button rendered before an admin suspended the row stays live in an
 * open tab — no revalidation reaches it — so the action itself has to refuse.
 * Paying a suspended invitation buys nothing: the dashboard gate, the public
 * takedown and the publish API all still fire.
 */
describe('suspension guard on money-moving actions', () => {
  const SUSPENDED = {
    id: 'inv-1', slug: 'x', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1',
    email: 'e@x.com', is_paid: true, expires_at: null, gateway_order_id: null,
    guest_quota_extra: 0, expected_amount_idr: 100000,
    suspended_at: '2026-08-01T00:00:00.000Z',
  }
  const fake = () => createFakeSupabase({
    tables: {
      invitations: { select: { data: SUSPENDED }, update: {} },
      plan_upgrades: { select: { data: null }, insert: {} },
      quota_addons: { select: { data: null }, insert: {} },
    },
  })

  // Every action that mints or settles a charge. requestRefund is deliberately absent.
  const MONEY_ACTIONS: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
    ['startCheckout', () => startCheckout('inv-1')],
    ['recheckPayment', () => recheckPayment('inv-1')],
    ['startRenewal', () => startRenewal('inv-1')],
    ['recheckRenewal', () => recheckRenewal('inv-1')],
    ['startUpgradeCheckout', () => startUpgradeCheckout('inv-1')],
    ['recheckUpgrade', () => recheckUpgrade('inv-1')],
    ['startQuotaAddonCheckout', () => startQuotaAddonCheckout('inv-1', 50)],
    ['recheckQuotaAddon', () => recheckQuotaAddon('inv-1')],
  ]

  it.each(MONEY_ACTIONS)('%s refuses a suspended invitation', async (_name, run) => {
    mockAdmin.mockReturnValue(fake() as any)
    const r = await run()
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/dinonaktifkan oleh admin/i)
  })

  it('mints no transaction for any of them', async () => {
    for (const [, run] of MONEY_ACTIONS) {
      mockAdmin.mockReturnValue(fake() as any)
      await run()
    }
    expect(mockCreateInvoice).not.toHaveBeenCalled()
  })

  // A blocked customer asking for their money back is exactly the person who most
  // needs that path open, so requestRefund must NOT be gated on suspension.
  it('still lets a suspended owner request a refund', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({
      tables: {
        invitations: {
          select: { data: { ...SUSPENDED, paid_source: 'midtrans', paid_channel: 'qris', paid_at: '2026-08-01T00:00:00.000Z' } },
        },
        refund_requests: { select: { data: [] }, insert: {} },
      },
    }) as any)
    const r = await requestRefund('inv-1', { category: 'other' })
    expect(r.ok).toBe(true)
  })
})
