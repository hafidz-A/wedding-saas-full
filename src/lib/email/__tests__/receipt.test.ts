import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../send', () => ({ sendAdminEmail: vi.fn() }))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn() }))
import { sendAdminEmail } from '../send'
import { resolvePlan } from '@/lib/payments/plans'
import { sendPaymentReceipt } from '../receipt'

const mockSend = vi.mocked(sendAdminEmail)
const mockResolve = vi.mocked(resolvePlan)

/** Fake admin client: .from(table).select().eq().order().limit().maybeSingle() */
function fakeDb(rows: Record<string, any>) {
  return {
    from: vi.fn((table: string) => {
      const result = Promise.resolve({ data: rows[table] ?? null })
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(() => result),
      }
      return chain
    }),
  }
}

const INV = {
  slug: 'adi-rani', email: 'couple@example.com', plan: 'premium', template_id: 'lovebirds',
  paid_channel: 'bank_transfer', gateway_order_id: 'inv_uuid_abc123', paid_amount_idr: 299000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockResolvedValue(true)
})

describe('sendPaymentReceipt', () => {
  it('initial: emails the owner a LUNAS receipt with amount, order id, and links', async () => {
    const db = fakeDb({ invitations: INV })
    await sendPaymentReceipt(db as any, 'inv-1', 'initial')
    expect(mockSend).toHaveBeenCalledOnce()
    const mail = mockSend.mock.calls[0][0]
    expect(mail.to).toBe('couple@example.com')
    expect(mail.subject).toContain('adi-rani')
    expect(mail.html).toContain('LUNAS')
    expect(mail.html).toContain('299.000')
    expect(mail.html).toContain('inv_uuid_abc123')
    expect(mail.html).toContain('/lovebirds/adi-rani/dashboard')
    expect(mail.html).toContain('Transfer Bank')
  })

  it('renewal: derives the amount from the current plan price', async () => {
    mockResolve.mockResolvedValue({ planId: 'premium', amountIDR: 250000, expiresAt: () => null } as any)
    const db = fakeDb({ invitations: INV })
    await sendPaymentReceipt(db as any, 'inv-1', 'renewal')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][0].html).toContain('250.000')
    expect(mockSend.mock.calls[0][0].subject.toLowerCase()).toContain('perpanjang')
  })

  it('upgrade: reads the paid difference from the latest paid plan_upgrades row', async () => {
    const db = fakeDb({ invitations: INV, plan_upgrades: { amount_idr: 150000 } })
    await sendPaymentReceipt(db as any, 'inv-1', 'upgrade')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][0].html).toContain('150.000')
  })

  it('addon: reads amount + qty from the latest paid quota_addons row', async () => {
    const db = fakeDb({ invitations: INV, quota_addons: { amount_idr: 50000, qty_guests: 50 } })
    await sendPaymentReceipt(db as any, 'inv-1', 'addon')
    expect(mockSend).toHaveBeenCalledOnce()
    const mail = mockSend.mock.calls[0][0]
    expect(mail.html).toContain('50.000')
    expect(mail.html).toContain('50 tamu')
  })

  it('skips silently when the invitation has no email', async () => {
    const db = fakeDb({ invitations: { ...INV, email: null } })
    await sendPaymentReceipt(db as any, 'inv-1', 'initial')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('never throws — a DB failure is swallowed (receipts must not break payments)', async () => {
    const db = { from: vi.fn(() => { throw new Error('db down') }) }
    await expect(sendPaymentReceipt(db as any, 'inv-1', 'initial')).resolves.toBeUndefined()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('never throws — a send failure is swallowed', async () => {
    mockSend.mockRejectedValue(new Error('resend down'))
    const db = fakeDb({ invitations: INV })
    await expect(sendPaymentReceipt(db as any, 'inv-1', 'initial')).resolves.toBeUndefined()
  })
})
