import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/payments/xendit', () => ({
  isValidCallbackToken: vi.fn(),
  getXenditInvoice: vi.fn(),
  isPaidStatus: vi.fn(() => true),
  invitationIdFromExternalId: vi.fn(() => 'inv-1'),
}))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn() }))
vi.mock('@/lib/payments/publish', () => ({ publishPaidInvitation: vi.fn(), applyPaidUpgrade: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken, getXenditInvoice, isPaidStatus, invitationIdFromExternalId } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'
import { publishPaidInvitation } from '@/lib/payments/publish'
import { POST } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockToken = vi.mocked(isValidCallbackToken)
const mockGetInvoice = vi.mocked(getXenditInvoice)
const mockIsPaid = vi.mocked(isPaidStatus)
const mockExtId = vi.mocked(invitationIdFromExternalId)
const mockResolve = vi.mocked(resolvePlan)
const mockPublish = vi.mocked(publishPaidInvitation)

beforeEach(() => {
  vi.clearAllMocks()
  mockToken.mockReturnValue(true)
  mockIsPaid.mockReturnValue(true)
  mockExtId.mockReturnValue('inv-1')
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
})
