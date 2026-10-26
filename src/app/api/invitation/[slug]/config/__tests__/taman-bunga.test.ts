// Saving a Taman Bunga invitation through the real config route: the full
// demo config round-trips, gift accounts are encrypted at rest, and the
// template's fixed walk is enforced server-side (no reorder, no dropping
// the gate or the closing, sections may be switched off).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { decryptConfig } from '@/lib/crypto/config'
import { defaultConfig } from '@/all-templates/taman-bunga/defaultConfig.js'

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { PUT } from '../route'

const mockAdmin = vi.mocked(createSupabaseAdminClient)
const mockOwner = vi.mocked(verifyOwnership)
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})
beforeEach(() => {
  vi.clearAllMocks()
  mockOwner.mockResolvedValue({ id: 'inv-tb', owner_user_id: 'user-1' } as any)
})

const ctx = { params: { slug: 'nadia-arya' } }
const put = (body: any) =>
  new Request('http://localhost/api/invitation/nadia-arya/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const stored = clone(defaultConfig) as any

function db() {
  const fake = createFakeSupabase({
    tables: {
      invitations: {
        select: { data: { config: stored, updated_at: 'T1', template_id: 'taman-bunga' } },
        update: { data: { updated_at: 'T2' } },
      },
    },
  })
  mockAdmin.mockReturnValue(fake as any)
  return fake
}

describe('PUT config — Taman Bunga', () => {
  it('saves every section edited, and encrypts the gift accounts', async () => {
    const fake = db()
    const next = clone(defaultConfig) as any
    const byId = (id: string) => next.sections.find((s: any) => s.id === id)
    byId('quote').props.text = 'Dan di antara tanda-tanda kebesaran-Nya…'
    byId('closing').props.couplePhoto = 'https://example.com/foto-kami.jpg'
    const gift = byId('gift').props
    gift.accounts = [{ id: 'a1', name: 'BCA', accountNumber: '5550001112', accountHolder: 'Nadia Putri' }]

    const res = await PUT(put({ config: next }), ctx)
    expect(res.status).toBe(200)

    const written = fake.lastCall('update')!.value.config
    // at rest: the account number and holder are not stored in plain text
    expect(JSON.stringify(written)).not.toContain('5550001112')
    expect(JSON.stringify(written)).not.toContain('Nadia Putri')
    // decrypted, everything the owner typed is there
    const back = decryptConfig(written) as any
    const get = (id: string) => back.sections.find((s: any) => s.id === id).props
    expect(get('quote').text).toBe('Dan di antara tanda-tanda kebesaran-Nya…')
    expect(get('closing').couplePhoto).toBe('https://example.com/foto-kami.jpg')
    expect(get('gift').accounts[0]).toMatchObject({ name: 'BCA', accountNumber: '5550001112', accountHolder: 'Nadia Putri' })
    expect(back.sections.map((s: any) => s.id)).toEqual(defaultConfig.sections.map((s: any) => s.id))
  })

  it('accepts switching a middle section off (the walk squeezes it)', async () => {
    db()
    const next = clone(defaultConfig) as any
    next.sections.find((s: any) => s.id === 'story').enabled = false
    expect((await PUT(put({ config: next }), ctx)).status).toBe(200)
  })

  it('rejects reordering the walk', async () => {
    db()
    const next = clone(defaultConfig) as any
    const i = next.sections.findIndex((s: any) => s.id === 'story')
    ;[next.sections[i], next.sections[i + 1]] = [next.sections[i + 1], next.sections[i]]
    expect((await PUT(put({ config: next }), ctx)).status).toBe(422)
  })

  it('rejects dropping a section, or switching the gate or closing off', async () => {
    db()
    const dropped = clone(defaultConfig) as any
    dropped.sections = dropped.sections.filter((s: any) => s.id !== 'gallery')
    expect((await PUT(put({ config: dropped }), ctx)).status).toBe(422)

    for (const id of ['cover', 'closing']) {
      db()
      const off = clone(defaultConfig) as any
      off.sections.find((s: any) => s.id === id).enabled = false
      expect((await PUT(put({ config: off }), ctx)).status, id).toBe(422)
    }
  })
})
