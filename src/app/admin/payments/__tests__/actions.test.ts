import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/admin/is-admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/admin/log', () => ({ logAdminAction: vi.fn() }))
vi.mock('@/lib/admin/revalidate', () => ({ revalidateInvitation: vi.fn() }))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: any[]) => any) => fn,
}))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn() }))
vi.mock('@/lib/payments/gateway', () => ({
  getTransactionStatus: vi.fn(),
  isPaidStatus: vi.fn(),
  createGatewayRefund: vi.fn(),
  canApiRefund: (c: string | null | undefined) =>
    !!c && ['credit_card', 'gopay', 'shopeepay', 'dana', 'ovo', 'qris', 'kredivo', 'akulaku'].includes(c),
}))
// ITEM 0 regression guard: these mocks assert their FIRST arg is a real
// Supabase client (has `.from`) — the pre-fix bug passed the guard()
// `{ email }` object instead, which has no `.from`/`.rpc` and would crash
// here. If the fix regresses, these implementations throw and the test fails.
vi.mock('@/lib/payments/publish', () => ({
  publishPaidInvitation: vi.fn(async (db: any) => {
    if (typeof db?.from !== 'function') throw new TypeError('db.from is not a function')
  }),
  applyPaidUpgrade: vi.fn(async (db: any) => {
    if (typeof db?.from !== 'function') throw new TypeError('db.from is not a function')
  }),
  applyPaidQuotaAddon: vi.fn(async (db: any) => {
    if (typeof db?.from !== 'function') throw new TypeError('db.from is not a function')
  }),
}))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { getTransactionStatus, isPaidStatus, createGatewayRefund } from '@/lib/payments/gateway'
import { resolvePlan } from '@/lib/payments/plans'
import { publishPaidInvitation, applyPaidUpgrade, applyPaidQuotaAddon } from '@/lib/payments/publish'
import {
  adminRefundViaGateway, adminRecheckPayment, adminRecheckUpgrade, adminRecheckQuotaAddon,
  validatePaymentPatch,
} from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockSnap = vi.mocked(getTransactionStatus)
const mockIsPaid = vi.mocked(isPaidStatus)
const mockCreateRefund = vi.mocked(createGatewayRefund)
const mockResolvePlan = vi.mocked(resolvePlan)
const mockPublish = vi.mocked(publishPaidInvitation)
const mockApplyUpgrade = vi.mocked(applyPaidUpgrade)
const mockApplyAddon = vi.mocked(applyPaidQuotaAddon)

const ADMIN = { email: 'admin@fincards.land' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue(ADMIN)
  mockIsPaid.mockReturnValue(true)
  mockResolvePlan.mockResolvedValue({ amountIDR: 100000 } as any)
})

describe('adminRefundViaGateway — guard chain', () => {
  it('rejects a non-midtrans source (e.g. manual/comp payment)', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              id: 'inv-1', paid_amount_idr: 100000, paid_source: 'manual',
              gateway_order_id: null, paid_channel: null, is_paid: true,
            },
          },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await adminRefundViaGateway('initial', 'inv-1')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/hanya untuk pembayaran Midtrans/i)
    expect(mockCreateRefund).not.toHaveBeenCalled()
  })

  it('rejects a non-refundable channel (bank_transfer) with the manual-route message', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              id: 'inv-1', paid_amount_idr: 100000, paid_source: 'midtrans',
              gateway_order_id: 'inv_inv-1_1', paid_channel: 'bank_transfer', is_paid: true,
            },
          },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    const r = await adminRefundViaGateway('initial', 'inv-1')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/transfer balik manual/i)
    expect(mockCreateRefund).not.toHaveBeenCalled()
  })

  it('persists refund_key = rfd-<rowId> BEFORE calling the gateway API', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              id: 'inv-1', paid_amount_idr: 100000, paid_source: 'midtrans',
              gateway_order_id: 'inv_inv-1_1', paid_channel: 'qris', is_paid: true,
            },
          },
        },
        refunds: {
          select: { data: [] }, // sourceHasOpenRefund: no open refund
          insert: { data: { id: 'r1' } },
          update: { data: null },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)

    let keySetBeforeApiCall = false
    mockCreateRefund.mockImplementation(async () => {
      const priorUpdates = fake._calls.filter((c) => c.kind === 'update' && c.table === 'refunds')
      keySetBeforeApiCall = priorUpdates.some((u) => u.value?.refund_key === 'rfd-r1')
      // Return a non-terminal status so settleRefund's own update chain isn't exercised here.
      return { refundId: 'grf-1', status: 'pending' } as any
    })

    const r = await adminRefundViaGateway('initial', 'inv-1')
    expect(r.ok).toBe(true)
    expect(keySetBeforeApiCall).toBe(true)
    const refundKeyCall = fake._calls.find((c) => c.kind === 'update' && c.table === 'refunds' && c.value?.refund_key)
    expect(refundKeyCall?.value).toEqual({ refund_key: 'rfd-r1' })
  })

  it('marks the row failed when the gateway API call throws', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              id: 'inv-1', paid_amount_idr: 100000, paid_source: 'midtrans',
              gateway_order_id: 'inv_inv-1_1', paid_channel: 'qris', is_paid: true,
            },
          },
        },
        refunds: {
          select: { data: [] },
          insert: { data: { id: 'r1' } },
          update: { data: null },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    mockCreateRefund.mockRejectedValue(new Error('Midtrans down'))

    const r = await adminRefundViaGateway('initial', 'inv-1')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/gagal/i)
    const failedUpdate = fake.lastCall('update')
    expect(failedUpdate?.table).toBe('refunds')
    expect(failedUpdate?.value?.status).toBe('failed')
    expect(String(failedUpdate?.value?.reason)).toMatch(/Midtrans down/)
  })
})

describe('ITEM 0 fix — admin recheck actions pass the DB client, not the guard object', () => {
  it('adminRecheckPayment: publishPaidInvitation receives a real Supabase client', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: {
            data: {
              id: 'inv-1', plan: 'premium', template_id: 'lovebirds', is_paid: false,
              gateway_order_id: 'inv_inv-1_1', guest_quota_extra: 0, expected_amount_idr: 100000,
            },
          },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    mockSnap.mockResolvedValue({
      orderId: 'inv_inv-1_1', transactionId: 'txn-1', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 100000, paymentType: 'qris',
    } as any)

    const r = await adminRecheckPayment('inv-1')
    expect(r).toMatchObject({ ok: true, applied: true })
    expect(mockPublish).toHaveBeenCalledOnce()
    // The mock throws if arg[0] lacks `.from` — reaching here proves it was `db`.
    expect(typeof mockPublish.mock.calls[0][0].from).toBe('function')
  })

  it('adminRecheckUpgrade: applyPaidUpgrade receives a real Supabase client', async () => {
    const UPG = { id: 'u1', invitation_id: 'inv-1', to_plan: 'premium', amount_idr: 50000, gateway_order_id: 'upg_inv-1_1', status: 'pending' }
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { id: 'inv-1', template_id: 'lovebirds' } } },
        plan_upgrades: { select: { data: UPG }, update: {} },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    mockSnap.mockResolvedValue({
      orderId: 'upg_inv-1_1', transactionId: 'txn-2', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 50000, paymentType: 'gopay',
    } as any)

    const r = await adminRecheckUpgrade('inv-1')
    expect(r).toMatchObject({ ok: true, applied: true })
    expect(mockApplyUpgrade).toHaveBeenCalledOnce()
    expect(typeof mockApplyUpgrade.mock.calls[0][0].from).toBe('function')
  })

  it('adminRecheckQuotaAddon: applyPaidQuotaAddon receives a real Supabase client', async () => {
    const ADDON = { id: 'a1', invitation_id: 'inv-1', qty_guests: 100, amount_idr: 20000, gateway_order_id: 'qta_inv-1_1', status: 'pending' }
    const fake = createFakeSupabase({
      tables: { quota_addons: { select: { data: ADDON }, update: {} } },
    })
    mockAdmin.mockReturnValue(fake as any)
    mockSnap.mockResolvedValue({
      orderId: 'qta_inv-1_1', transactionId: 'txn-3', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 20000, paymentType: 'qris',
    } as any)

    const r = await adminRecheckQuotaAddon('inv-1')
    expect(r).toMatchObject({ ok: true, applied: true })
    expect(mockApplyAddon).toHaveBeenCalledOnce()
    expect(typeof mockApplyAddon.mock.calls[0][0].from).toBe('function')
  })
})

describe('validatePaymentPatch', () => {
  it('normalizes a leading-zero phone to 62', () => {
    const r = validatePaymentPatch({ mode: 'manual', whatsapp: '0851-1055-3938', email: 'a@b.com' })
    expect(r.ok && r.value.whatsapp).toBe('6285110553938')
  })
  it('rejects manual mode with a bad email', () => {
    expect(validatePaymentPatch({ mode: 'manual', whatsapp: '628', email: 'nope' }).ok).toBe(false)
  })
  it('allows gateway with blank contacts', () => {
    expect(validatePaymentPatch({ mode: 'gateway', whatsapp: '', email: '' }).ok).toBe(true)
  })
})
