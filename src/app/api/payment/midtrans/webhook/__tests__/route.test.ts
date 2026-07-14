import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash } from 'crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

// verifySignature / isPaidStatus / parseGrossAmount / invitationIdFromOrderId /
// renewalIdFromOrderId are pure and cheap — keep the REAL implementations so
// the tests exercise the actual signature + status logic. Only the network
// call (getTransactionStatus) is mocked.
vi.mock('@/lib/payments/gateway', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/payments/gateway')>()
  return { ...actual, getTransactionStatus: vi.fn() }
})
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn() }))
vi.mock('@/lib/payments/publish', () => ({
  publishPaidInvitation: vi.fn(),
  applyPaidUpgrade: vi.fn(),
  extendActivePeriod: vi.fn(),
  applyPaidQuotaAddon: vi.fn(),
}))
vi.mock('@/lib/payments/refunds', () => ({ settleRefund: vi.fn(), sourceHasOpenRefund: vi.fn() }))
vi.mock('@/lib/admin/log', () => ({ logAdminAction: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getTransactionStatus } from '@/lib/payments/gateway'
import { resolvePlan } from '@/lib/payments/plans'
import { publishPaidInvitation, applyPaidUpgrade, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { settleRefund, sourceHasOpenRefund } from '@/lib/payments/refunds'
import { logAdminAction } from '@/lib/admin/log'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockSnap = vi.mocked(getTransactionStatus)
const mockResolve = vi.mocked(resolvePlan)
const mockPublish = vi.mocked(publishPaidInvitation)
const mockUpgrade = vi.mocked(applyPaidUpgrade)
const mockExtend = vi.mocked(extendActivePeriod)
const mockAddonApply = vi.mocked(applyPaidQuotaAddon)
const mockSettleRefund = vi.mocked(settleRefund)
const mockHasOpenRefund = vi.mocked(sourceHasOpenRefund)
const mockLog = vi.mocked(logAdminAction)

const KEY = 'SB-Mid-server-TEST'

function withSig(b: Record<string, unknown>) {
  return {
    ...b,
    signature_key: createHash('sha512')
      .update(`${b.order_id}${b.status_code}${b.gross_amount}${KEY}`)
      .digest('hex'),
  }
}

const post = (body: unknown) =>
  POST(new Request('http://x/api/payment/midtrans/webhook', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MIDTRANS_SERVER_KEY = KEY
  mockHasOpenRefund.mockResolvedValue(false)
})

const INV = {
  id: 'inv-1', plan: 'premium', template_id: 'lovebirds', is_paid: false,
  gateway_order_id: null, guest_quota_extra: 0, expected_amount_idr: null,
}
const invFake = (inv: any = INV) => createFakeSupabase({ tables: { invitations: { select: { data: inv }, update: {} } } })

describe('POST /api/payment/midtrans/webhook', () => {
  it('401s a notification with a bad signature', async () => {
    const res = await post({ order_id: 'inv_a_1', status_code: '200', gross_amount: '149000.00', signature_key: 'forged' })
    expect(res.status).toBe(401)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes an initial purchase on settlement with matching amount', async () => {
    const admin = invFake()
    mockAdmin.mockReturnValue(admin as any)
    mockResolve.mockResolvedValue({ amountIDR: 149000 } as any)
    mockSnap.mockResolvedValue({
      orderId: 'inv_inv-1_1', transactionId: 'txn-1', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 149000, paymentType: 'qris',
    })
    const body = withSig({
      order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00',
      transaction_status: 'settlement', transaction_id: 'txn-1', payment_type: 'qris',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockPublish).toHaveBeenCalledOnce()
    expect(mockPublish.mock.calls[0][3]).toEqual({
      paidAmountIDR: 149000, paidSource: 'midtrans', feeIDR: null,
      paidChannel: 'qris', gatewayTxnId: 'txn-1',
    })
    const upd = admin.lastCall('update')
    expect(upd?.table).toBe('invitations')
    expect(upd?.value).toEqual({ gateway_order_id: 'inv_inv-1_1' })
  })

  it('does NOT publish on capture+challenge', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    const body = withSig({
      order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00',
      transaction_status: 'capture', fraud_status: 'challenge',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockSnap).not.toHaveBeenCalled()
  })

  it('does NOT publish when re-fetched amount mismatches', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    mockResolve.mockResolvedValue({ amountIDR: 149000 } as any)
    mockSnap.mockResolvedValue({
      orderId: 'inv_inv-1_1', transactionId: 'txn-1', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 50000, paymentType: 'qris',
    })
    const body = withSig({
      order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00',
      transaction_status: 'settlement',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('extends the active period for a ren_ settlement', async () => {
    const REN_INV = { id: 'inv-1', plan: 'premium', template_id: 'lovebirds', gateway_order_id: null }
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: REN_INV } } } }) as any)
    mockResolve.mockResolvedValue({ amountIDR: 149000 } as any)
    mockSnap.mockResolvedValue({
      orderId: 'ren_inv-1_1', transactionId: 'txn-2', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 149000, paymentType: 'bank_transfer',
    })
    const body = withSig({
      order_id: 'ren_inv-1_1', status_code: '200', gross_amount: '149000.00',
      transaction_status: 'settlement',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockExtend).toHaveBeenCalledOnce()
    expect(mockExtend.mock.calls[0][1]).toEqual(REN_INV)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('applies a paid upgrade for an upg_ settlement', async () => {
    const UPG = { id: 'u1', invitation_id: 'inv-1', to_plan: 'premium', amount_idr: 50000, gateway_order_id: 'upg_inv-1_1', status: 'pending' }
    const admin = createFakeSupabase({
      tables: {
        plan_upgrades: { select: { data: UPG }, update: {} },
        invitations: { select: { data: { template_id: 'lovebirds' } } },
      },
    })
    mockAdmin.mockReturnValue(admin as any)
    mockSnap.mockResolvedValue({
      orderId: 'upg_inv-1_1', transactionId: 'txn-3', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 50000, paymentType: 'gopay',
    })
    const body = withSig({
      order_id: 'upg_inv-1_1', status_code: '200', gross_amount: '50000.00',
      transaction_status: 'settlement', transaction_id: 'txn-3', payment_type: 'gopay',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockUpgrade).toHaveBeenCalledOnce()
    expect(mockUpgrade.mock.calls[0][1]).toEqual({ id: 'u1', invitation_id: 'inv-1', to_plan: 'premium', template_id: 'lovebirds' })
    const upd = admin.lastCall('update')
    expect(upd?.table).toBe('plan_upgrades')
    expect(upd?.value).toEqual({ paid_channel: 'gopay', gateway_txn_id: 'txn-3' })
  })

  it('applies a quota addon for a qta_ settlement', async () => {
    const ADDON = { id: 'a1', invitation_id: 'inv-1', qty_guests: 100, amount_idr: 20000, gateway_order_id: 'qta_inv-1_1', status: 'pending' }
    const admin = createFakeSupabase({ tables: { quota_addons: { select: { data: ADDON }, update: {} } } })
    mockAdmin.mockReturnValue(admin as any)
    mockSnap.mockResolvedValue({
      orderId: 'qta_inv-1_1', transactionId: 'txn-4', status: 'settlement',
      fraudStatus: null, grossAmountIDR: 20000, paymentType: 'qris',
    })
    const body = withSig({
      order_id: 'qta_inv-1_1', status_code: '200', gross_amount: '20000.00',
      transaction_status: 'settlement', transaction_id: 'txn-4', payment_type: 'qris',
    })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockAddonApply).toHaveBeenCalledOnce()
    expect(mockAddonApply.mock.calls[0][1]).toEqual({ id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })
    const upd = admin.lastCall('update')
    expect(upd?.table).toBe('quota_addons')
    expect(upd?.value).toEqual({ paid_channel: 'qris', gateway_txn_id: 'txn-4' })
  })

  it('settles the pending refund row on a refund notification', async () => {
    const admin = createFakeSupabase({
      tables: { refunds: { select: { data: [{ id: 'r1', status: 'pending' }] } } },
    })
    mockAdmin.mockReturnValue(admin as any)
    const body = withSig({ order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00', transaction_status: 'refund' })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockSettleRefund).toHaveBeenCalledOnce()
    expect(mockSettleRefund.mock.calls[0][1]).toBe('r1')
  })

  it('records + settles a chargeback exactly once', async () => {
    const admin = createFakeSupabase({
      tables: {
        invitations: { select: { data: { paid_amount_idr: 149000 } } },
        refunds: { insert: { data: { id: 'rc1' } } },
      },
    })
    mockAdmin.mockReturnValue(admin as any)
    mockHasOpenRefund.mockResolvedValue(false)
    const body = withSig({ order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00', transaction_status: 'chargeback' })
    const res = await post(body)
    expect(res.status).toBe(200)
    const ins = admin.lastCall('insert')
    expect(ins?.table).toBe('refunds')
    expect(ins?.value).toEqual({
      invitation_id: 'inv-1', source_type: 'initial', source_id: 'inv-1',
      amount_idr: 149000, method: 'chargeback', status: 'pending',
      reason: 'Chargeback / dispute bank',
    })
    expect(mockSettleRefund).toHaveBeenCalledOnce()
    expect(mockSettleRefund.mock.calls[0][1]).toBe('rc1')
    expect(mockLog).toHaveBeenCalledOnce()
    expect(mockLog).toHaveBeenCalledWith('system (midtrans)', { action: 'payment.chargeback', targetType: 'invitation', targetId: 'inv-1' })
  })

  it('records a chargeback on an upg_ order with the UPGRADE amount, not the invitation paid_amount_idr', async () => {
    const admin = createFakeSupabase({
      tables: {
        plan_upgrades: {
          select: [
            { data: { id: 'u1', invitation_id: 'inv-1' } }, // sourceFromOrderId lookup
            { data: { amount_idr: 50000 } }, // refundable-amount lookup
          ],
        },
        // Decoy: invitations.paid_amount_idr is the INITIAL purchase amount and
        // must NOT be used to net an upgrade chargeback.
        invitations: { select: { data: { paid_amount_idr: 149000 } } },
        refunds: { insert: { data: { id: 'rc2' } } },
      },
    })
    mockAdmin.mockReturnValue(admin as any)
    mockHasOpenRefund.mockResolvedValue(false)
    const body = withSig({ order_id: 'upg_inv-1_1', status_code: '200', gross_amount: '50000.00', transaction_status: 'chargeback' })
    const res = await post(body)
    expect(res.status).toBe(200)
    const ins = admin.lastCall('insert')
    expect(ins?.table).toBe('refunds')
    expect(ins?.value).toEqual({
      invitation_id: 'inv-1', source_type: 'upgrade', source_id: 'u1',
      amount_idr: 50000, method: 'chargeback', status: 'pending',
      reason: 'Chargeback / dispute bank',
    })
    expect(mockSettleRefund).toHaveBeenCalledOnce()
    expect(mockSettleRefund.mock.calls[0][1]).toBe('rc2')
  })

  it('skips a chargeback when the source already has an open refund', async () => {
    const admin = createFakeSupabase({
      tables: { invitations: { select: { data: { paid_amount_idr: 149000 } } } },
    })
    mockAdmin.mockReturnValue(admin as any)
    mockHasOpenRefund.mockResolvedValue(true)
    const body = withSig({ order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00', transaction_status: 'chargeback' })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockSettleRefund).not.toHaveBeenCalled()
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('acks pending/expire without side effects', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    const body = withSig({ order_id: 'inv_inv-1_1', status_code: '200', gross_amount: '149000.00', transaction_status: 'pending' })
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockExtend).not.toHaveBeenCalled()
    expect(mockUpgrade).not.toHaveBeenCalled()
    expect(mockAddonApply).not.toHaveBeenCalled()
    expect(mockSettleRefund).not.toHaveBeenCalled()
    expect(mockSnap).not.toHaveBeenCalled()
  })
})
