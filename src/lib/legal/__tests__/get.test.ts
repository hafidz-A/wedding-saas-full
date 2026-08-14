import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getLegalDoc } from '../get'
import { DEFAULT_LEGAL_HTML, DEFAULT_REVISED_ISO } from '../defaults'

const mockAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLegalDoc', () => {
  it('returns the DB row when one exists, and sanitizes it on read', async () => {
    const fake = createFakeSupabase({
      tables: {
        legal_documents: {
          select: {
            data: {
              // onclick + a <script> tag: neither belongs in the rendered output —
              // proves the sanitizer runs on the READ path, not just on save.
              content_html: '<p onclick="x()">Custom <script>alert(1)</script>teks</p>',
              revised_at: '2026-08-10T00:00:00.000Z',
            },
          },
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)

    const r = await getLegalDoc('terms', 'id')

    expect(r.source).toBe('db')
    expect(r.revisedAt).toBe('2026-08-10T00:00:00.000Z')
    expect(r.html).toBe('<p>Custom teks</p>')
  })

  it('falls back to the committed default when no row exists', async () => {
    const fake = createFakeSupabase({
      tables: { legal_documents: { select: { data: null, error: null } } },
    })
    mockAdmin.mockReturnValue(fake as any)

    const r = await getLegalDoc('privacy', 'en')

    expect(r.source).toBe('default')
    expect(r.html).toBe(DEFAULT_LEGAL_HTML.privacy.en)
    expect(r.revisedAt).toBe(DEFAULT_REVISED_ISO)
  })

  it('falls back to the default when the query itself returns an error', async () => {
    const fake = createFakeSupabase({
      tables: { legal_documents: { select: { data: null, error: { message: 'boom' } } } },
    })
    mockAdmin.mockReturnValue(fake as any)

    const r = await getLegalDoc('terms', 'en')

    expect(r.source).toBe('default')
    expect(r.html).toBe(DEFAULT_LEGAL_HTML.terms.en)
  })

  it('falls back to the default when the DB client throws — e.g. the migration has not been applied yet', async () => {
    mockAdmin.mockImplementation(() => {
      throw new Error('relation "public.legal_documents" does not exist')
    })

    const r = await getLegalDoc('refund', 'id')

    expect(r.source).toBe('default')
    expect(r.html).toBe(DEFAULT_LEGAL_HTML.refund.id)
    expect(r.revisedAt).toBe(DEFAULT_REVISED_ISO)
  })

  it('never throws — a rejected query resolves to the default instead of propagating', async () => {
    const fake = createFakeSupabase({})
    fake.from = () => {
      throw new Error('unexpected client failure')
    }
    mockAdmin.mockReturnValue(fake as any)

    await expect(getLegalDoc('terms', 'id')).resolves.toMatchObject({ source: 'default' })
  })
})
