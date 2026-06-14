import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => ({ auth: { getUser } }) }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/payments/plans', () => ({ resolvePlan: vi.fn(), resolveUpgrade: vi.fn() }))
vi.mock('@/lib/payments/xendit', () => ({
  createXenditInvoice: vi.fn(),
  getXenditInvoice: vi.fn(),
  isPaidStatus: vi.fn(() => true),
  expireXenditInvoice: vi.fn(),
}))
vi.mock('@/lib/payments/publish', () => ({ publishPaidInvitation: vi.fn(), applyPaidUpgrade: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolvePlan } from '@/lib/payments/plans'
import { createXenditInvoice, getXenditInvoice, isPaidStatus } from '@/lib/payments/xendit'
import { publishPaidInvitation } from '@/lib/payments/publish'
import { completeOnboarding, checkSlugAvailable, startCheckout, recheckPayment } from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockResolvePlan = vi.mocked(resolvePlan)
const mockCreateInvoice = vi.mocked(createXenditInvoice)
const mockGetInvoice = vi.mocked(getXenditInvoice)
const mockIsPaid = vi.mocked(isPaidStatus)
const mockPublish = vi.mocked(publishPaidInvitation)

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
    slug: 'rizky-amara',
    template: 'lovebirds',
    plan: 'premium',
    brideName: 'Amara Sastrawijaya',
    groomName: 'Rizky Pratama',
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
    expect(r.publicUrl).toBe('/lovebirds/rizky-amara')
    expect(r.dashboardUrl).toBe('/lovebirds/rizky-amara/dashboard')
    const ins = fake._calls.find((c) => c.kind === 'insert' && c.table === 'invitations')!
    expect(ins.value.is_paid).toBe(false)
    expect(ins.value.is_published).toBe(false)
    expect(ins.value.owner_user_id).toBe('user-1')
    expect(ins.value.template_id).toBe('lovebirds')
  })
})

describe('checkSlugAvailable', () => {
  it('available when free', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: null } } } }) as any)
    expect(await checkSlugAvailable('rizky-amara')).toEqual({ available: true })
  })
  it('unavailable when taken', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { id: 'x' } } } } }) as any)
    expect((await checkSlugAvailable('rizky-amara')).available).toBe(false)
  })
  it('rejects an invalid format without hitting the DB', async () => {
    expect((await checkSlugAvailable('a')).available).toBe(false)
  })
})

describe('startCheckout', () => {
  const INV = { id: 'inv-1', slug: 'x', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1', email: 'e@x.com', is_paid: false, xendit_invoice_id: null }

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

  it('creates an invoice and returns the hosted URL', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV }, update: {} } } }) as any)
    mockCreateInvoice.mockResolvedValue({ id: 'invc-1', invoiceUrl: 'https://pay.test/invc-1' } as any)
    const r = await startCheckout('inv-1')
    expect(r.ok).toBe(true)
    expect(r.invoiceUrl).toBe('https://pay.test/invc-1')
  })
})

describe('recheckPayment', () => {
  const INV = { id: 'inv-1', plan: 'basic', template_id: 'lovebirds', owner_user_id: 'user-1', is_paid: false, xendit_invoice_id: 'invc-1' }

  it('returns early when already paid', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: { ...INV, is_paid: true } } } } }) as any)
    expect(await recheckPayment('inv-1')).toMatchObject({ ok: true, published: true })
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes when Xendit confirms paid for the right amount', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockGetInvoice.mockResolvedValue({ status: 'PAID', amountIDR: 100000 } as any)
    const r = await recheckPayment('inv-1')
    expect(r).toMatchObject({ ok: true, published: true })
    expect(mockPublish).toHaveBeenCalledOnce()
  })

  it('does NOT publish when the invoice is still unpaid', async () => {
    mockAdmin.mockReturnValue(createFakeSupabase({ tables: { invitations: { select: { data: INV } } } }) as any)
    mockIsPaid.mockReturnValue(false)
    mockGetInvoice.mockResolvedValue({ status: 'PENDING', amountIDR: 100000 } as any)
    const r = await recheckPayment('inv-1')
    expect(r).toMatchObject({ ok: true, published: false })
    expect(mockPublish).not.toHaveBeenCalled()
  })
})
