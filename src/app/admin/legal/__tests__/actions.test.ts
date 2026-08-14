import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/admin/is-admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/admin/log', () => ({ logAdminAction: vi.fn() }))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: any[]) => any) => fn,
}))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { saveLegalDoc, resetLegalDoc, getDefaultLegalHtml } from '../actions'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockLog = vi.mocked(logAdminAction)

const ADMIN = { email: 'admin@fincards.land' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue(ADMIN)
})

describe('saveLegalDoc — guard + validation', () => {
  it('rejects a non-admin caller', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('not-admin'))
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)

    const r = await saveLegalDoc({ docType: 'terms', lang: 'id', contentHtml: '<p>Halo</p>' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/akses ditolak/i)
    expect(fake._calls.some((c) => c.kind === 'upsert')).toBe(false)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('rejects an unknown docType', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    const r = await saveLegalDoc({ docType: 'faq', lang: 'id', contentHtml: '<p>Halo</p>' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/dokumen/i)
  })

  it('rejects an unknown lang', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    const r = await saveLegalDoc({ docType: 'terms', lang: 'fr', contentHtml: '<p>Halo</p>' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/bahasa/i)
  })

  it('rejects empty content', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    const r = await saveLegalDoc({ docType: 'terms', lang: 'id', contentHtml: '   ' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/kosong/i)
  })

  it('rejects content over 500 KB', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    const huge = `<p>${'a'.repeat(500 * 1024 + 1)}</p>`
    const r = await saveLegalDoc({ docType: 'terms', lang: 'id', contentHtml: huge })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/besar/i)
    expect(fake._calls.some((c) => c.kind === 'upsert')).toBe(false)
  })
})

describe('saveLegalDoc — the date rule (the heart of this task)', () => {
  it('a normal save (minorFix omitted) includes revised_at in the upsert', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)

    const r = await saveLegalDoc({ docType: 'terms', lang: 'id', contentHtml: '<p>Halo dunia</p>' })
    expect(r.ok).toBe(true)

    const upsertCall = fake.lastCall('upsert')
    expect(upsertCall?.table).toBe('legal_documents')
    expect(upsertCall?.value).toHaveProperty('revised_at')
    expect(typeof upsertCall?.value.revised_at).toBe('string')
    expect(upsertCall?.value.updated_at).toBeTruthy()
    expect(upsertCall?.value.updated_by).toBe(ADMIN.email)

    expect(mockLog).toHaveBeenCalledWith(
      ADMIN.email,
      expect.objectContaining({ action: 'legal.update', meta: expect.objectContaining({ minorFix: false }) }),
    )
  })

  it('minorFix: true OMITS revised_at from the upsert entirely (existing row keeps its published date)', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)

    const r = await saveLegalDoc({ docType: 'terms', lang: 'id', contentHtml: '<p>Perbaiki nomor WA</p>', minorFix: true })
    expect(r.ok).toBe(true)

    const upsertCall = fake.lastCall('upsert')
    expect(upsertCall?.value).not.toHaveProperty('revised_at')
    // updated_at/updated_by still move even on a minor fix — the audit trail
    // must reflect the real last-touch time regardless of the public date.
    expect(upsertCall?.value.updated_at).toBeTruthy()
    expect(upsertCall?.value.updated_by).toBe(ADMIN.email)

    expect(mockLog).toHaveBeenCalledWith(
      ADMIN.email,
      expect.objectContaining({ action: 'legal.update', meta: expect.objectContaining({ minorFix: true }) }),
    )
  })

  it('runs the content through sanitizeLegalHtml before writing (a script tag never reaches the row)', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)

    await saveLegalDoc({ docType: 'privacy', lang: 'en', contentHtml: '<p>ok</p><script>alert(1)</script>' })
    const upsertCall = fake.lastCall('upsert')
    expect(String(upsertCall?.value.content_html)).not.toMatch(/script/i)
  })

  it('upserts on the (doc_type, lang) conflict target', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    await saveLegalDoc({ docType: 'refund', lang: 'en', contentHtml: '<p>ok</p>' })
    const upsertCall = fake.lastCall('upsert')
    expect(upsertCall?.value.doc_type).toBe('refund')
    expect(upsertCall?.value.lang).toBe('en')
  })
})

describe('resetLegalDoc', () => {
  it('rejects a non-admin caller', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('not-admin'))
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    const r = await resetLegalDoc({ docType: 'terms', lang: 'id' })
    expect(r.ok).toBe(false)
    expect(fake._calls.some((c) => c.kind === 'delete')).toBe(false)
  })

  it('rejects an unknown docType/lang', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)
    expect((await resetLegalDoc({ docType: 'nope', lang: 'id' })).ok).toBe(false)
    expect((await resetLegalDoc({ docType: 'terms', lang: 'nope' })).ok).toBe(false)
  })

  it('deletes the row scoped to (doc_type, lang) and audits legal.reset', async () => {
    const fake = createFakeSupabase({})
    mockAdmin.mockReturnValue(fake as any)

    const r = await resetLegalDoc({ docType: 'privacy', lang: 'en' })
    expect(r.ok).toBe(true)

    expect(fake.lastCall('delete')?.table).toBe('legal_documents')
    const filters = fake._calls.filter((c) => c.kind === 'filter' && c.table === 'legal_documents')
    expect(filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: 'doc_type', value: 'privacy' }),
        expect.objectContaining({ column: 'lang', value: 'en' }),
      ]),
    )

    expect(mockLog).toHaveBeenCalledWith(
      ADMIN.email,
      expect.objectContaining({ action: 'legal.reset', targetId: 'privacy:en' }),
    )
  })
})

describe('getDefaultLegalHtml', () => {
  it('returns empty string for a non-admin caller', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('not-admin'))
    expect(await getDefaultLegalHtml('terms', 'id')).toBe('')
  })

  it('returns empty string for an invalid doc/lang', async () => {
    expect(await getDefaultLegalHtml('nope', 'id')).toBe('')
    expect(await getDefaultLegalHtml('terms', 'nope')).toBe('')
  })

  it('returns the committed default HTML for a valid doc/lang', async () => {
    const html = await getDefaultLegalHtml('refund', 'en')
    expect(html).toContain('<h2>1. General Provisions</h2>')
  })
})
