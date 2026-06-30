import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/payments/xendit', () => ({
  isValidCallbackToken: vi.fn(),
  getXenditInvoice: vi.fn(),
  isPaidStatus: vi.fn(() => true),
  invitationIdFromExternalId: vi.fn(() => 'inv-1'),
  renewalIdFromExternalId: vi.fn(() => 'inv-1'),
}))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn() }))
vi.mock('@/lib/payments/publish', () => ({ publishPaidInvitation: vi.fn(), applyPaidUpgrade: vi.fn(), extendActivePeriod: vi.fn(), applyPaidQuotaAddon: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken, getXenditInvoice, isPaidStatus, invitationIdFromExternalId, renewalIdFromExternalId } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'
import { publishPaidInvitation, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockToken = vi.mocked(isValidCallbackToken)
const mockGetInvoice = vi.mocked(getXenditInvoice)
const mockIsPaid = vi.mocked(isPaidStatus)
const mockExtId = vi.mocked(invitationIdFromExternalId)
const mockRenExtId = vi.mocked(renewalIdFromExternalId)
const mockResolve = vi.mocked(resolvePlan)
const mockPublish = vi.mocked(publishPaidInvitation)
const mockExtend = vi.mocked(extendActivePeriod)
const mockAddonApply = vi.mocked(applyPaidQuotaAddon)

beforeEach(() => {
  vi.clearAllMocks()
  mockToken.mockReturnValue(true)
  mockIsPaid.mockReturnValue(true)
  mockExtId.mockReturnValue('inv-1')
  mockRenExtId.mockReturnValue('inv-1')
})

const INV = { id: 'inv-1', plan: 'premium', template_id: 'lovebirds', is_paid: false, xendit_invoice_id: 'invc-1' }
function hook(body: any, token = 'good') {
  return new Request('http://localhost/api/payment/xendit/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-callback-token': token },
    body: JSON.stringify(body),
  })
}
const invFake = (inv: any = INV) => createFakeSupabase({ tables: { invitations: { select: { data: inv } } } })

describe('POST /api/payment/xendit/webhook', () => {
  it('SECURITY: 401 when the callback token is invalid', async () => {
    mockToken.mockReturnValue(false)
    mockAdmin.mockReturnValue(invFake() as any)
    expect((await POST(hook({ status: 'PAID', external_id: 'inv-1_x' }))).status).toBe(401)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('acks 200 without publishing for a non-PAID event', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    expect((await POST(hook({ status: 'PENDING', external_id: 'inv-1_x' }))).status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('acks 200 when the external_id is unparseable', async () => {
    mockExtId.mockReturnValue(null)
    mockAdmin.mockReturnValue(invFake() as any)
    expect((await POST(hook({ status: 'PAID', external_id: 'garbage' }))).status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('idempotent: does not re-publish an already-paid invitation', async () => {
    mockAdmin.mockReturnValue(invFake({ ...INV, is_paid: true }) as any)
    expect((await POST(hook({ status: 'PAID', external_id: 'inv-1_x' }))).status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes when payment verifies (re-fetched amount == plan price)', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    mockResolve.mockResolvedValue({ amountIDR: 100000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'inv-1_x', status: 'PAID', amountIDR: 100000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'inv-1_x', paid_amount: 100000 }))
    expect(res.status).toBe(200)
    expect(mockPublish).toHaveBeenCalledOnce()
  })

  it('SECURITY: does NOT publish when the paid amount mismatches the plan price', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    mockResolve.mockResolvedValue({ amountIDR: 100000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'inv-1_x', status: 'PAID', amountIDR: 50000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'inv-1_x', paid_amount: 50000 }))
    expect(res.status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('renewal: extends the active period (not publish) when payment verifies', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    mockResolve.mockResolvedValue({ amountIDR: 100000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'ren_inv-1_1', status: 'PAID', amountIDR: 100000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'ren_inv-1_1', paid_amount: 100000 }))
    expect(res.status).toBe(200)
    expect(mockExtend).toHaveBeenCalledOnce()
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('SECURITY: renewal does NOT extend on amount mismatch', async () => {
    mockAdmin.mockReturnValue(invFake() as any)
    mockResolve.mockResolvedValue({ amountIDR: 100000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'ren_inv-1_1', status: 'PAID', amountIDR: 1 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'ren_inv-1_1', paid_amount: 1 }))
    expect(res.status).toBe(200)
    expect(mockExtend).not.toHaveBeenCalled()
  })

  // ── Initial purchase: expected amount includes the guest-quota add-on ──

  it('publishes when paid amount == plan price + quota add-on', async () => {
    mockAdmin.mockReturnValue(invFake({ ...INV, guest_quota_extra: 100 }) as any) // +2 blocks
    mockResolve.mockResolvedValue({ amountIDR: 149000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'inv-1_x', status: 'PAID', amountIDR: 169000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'inv-1_x', paid_amount: 169000 }))
    expect(res.status).toBe(200)
    expect(mockPublish).toHaveBeenCalledOnce()
  })

  it('SECURITY: does NOT publish when paid amount omits the add-on', async () => {
    mockAdmin.mockReturnValue(invFake({ ...INV, guest_quota_extra: 100 }) as any)
    mockResolve.mockResolvedValue({ amountIDR: 149000 } as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'inv-1_x', status: 'PAID', amountIDR: 149000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'inv-1_x', paid_amount: 149000 }))
    expect(res.status).toBe(200)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  // ── Quota add-on (qta_) callbacks ──

  const ADDON = { id: 'a1', invitation_id: 'inv-1', qty_guests: 100, amount_idr: 20000, xendit_invoice_id: 'invc-1', status: 'pending' }
  const qtaFake = (addon: any = ADDON) =>
    createFakeSupabase({ tables: { quota_addons: { select: { data: addon }, update: {} } } })

  it('quota add-on: applies when payment verifies (amount == recorded amount_idr)', async () => {
    mockAdmin.mockReturnValue(qtaFake() as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'qta_inv-1_1', status: 'PAID', amountIDR: 20000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'qta_inv-1_1', paid_amount: 20000 }))
    expect(res.status).toBe(200)
    expect(mockAddonApply).toHaveBeenCalledOnce()
    expect(mockAddonApply.mock.calls[0][1]).toEqual({ id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('SECURITY: quota add-on does NOT apply on amount mismatch', async () => {
    mockAdmin.mockReturnValue(qtaFake() as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'qta_inv-1_1', status: 'PAID', amountIDR: 1 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'qta_inv-1_1', paid_amount: 1 }))
    expect(res.status).toBe(200)
    expect(mockAddonApply).not.toHaveBeenCalled()
  })

  it('quota add-on: idempotent — skips a row already paid', async () => {
    mockAdmin.mockReturnValue(qtaFake({ ...ADDON, status: 'paid' }) as any)
    mockGetInvoice.mockResolvedValue({ externalId: 'qta_inv-1_1', status: 'PAID', amountIDR: 20000 } as any)
    const res = await POST(hook({ id: 'invc-1', status: 'PAID', external_id: 'qta_inv-1_1', paid_amount: 20000 }))
    expect(res.status).toBe(200)
    expect(mockAddonApply).not.toHaveBeenCalled()
  })
})
