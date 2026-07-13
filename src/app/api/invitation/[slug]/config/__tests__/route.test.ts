import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { hashSections } from '@/editor/lib/sectionsHash'

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
})

const OWNER = { id: 'inv-1', owner_user_id: 'user-1' }
const ctx = { params: { slug: 'adi-rani' } }
function put(body: any, raw = false) {
  return new Request('http://localhost/api/invitation/adi-rani/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
const validConfig = { sections: [{ id: 'hero', type: 'hero', props: {} }] }
/** Hash the client would compute for the sections it loaded == the unchanged DB. */
const matchingHash = hashSections(validConfig.sections)

describe('PUT /api/invitation/[slug]/config', () => {
  it('403 when not the owner — and never reads the DB', async () => {
    mockOwner.mockResolvedValue(null)
    const res = await PUT(put({ config: validConfig }), ctx)
    expect(res.status).toBe(403)
    expect(mockAdmin).not.toHaveBeenCalled()
  })

  it('400 for invalid JSON, missing config, and non-array sections', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: {}, updated_at: 'T1' } }, update: {} } } }) as any,
    )
    expect((await PUT(put('x', true), ctx)).status).toBe(400)
    expect((await PUT(put({}), ctx)).status).toBe(400) // missing config
    expect((await PUT(put({ config: { sections: 'nope' } }), ctx)).status).toBe(400)
  })

  it('413 when the config is pathologically large', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(createFakeSupabase() as any)
    const huge = { sections: [], pad: 'x'.repeat(530 * 1024) }
    expect((await PUT(put({ config: huge }), ctx)).status).toBe(413)
  })

  // ── Content-aware optimistic concurrency ───────────────────────────────────
  // The guard fingerprints the SECTIONS the editor loaded, not the row's
  // updated_at, so the FOUR sibling sub-tabs (palette/music/meta/ornament) that
  // also bump the row can't trip a false "another tab is open" 409.

  it('409 when the stored SECTIONS changed since load (a real conflict)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    // The DB now holds DIFFERENT sections than the editor loaded.
    const storedSections = [{ id: 'hero', type: 'hero', props: { coupleName: 'EDITED ELSEWHERE' } }]
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: { sections: storedSections }, updated_at: 'T2' } }, update: {} } } }) as any,
    )
    // Baseline = hash of the OLD sections this tab loaded.
    const res = await PUT(put({ config: validConfig, baseSectionsHash: matchingHash }), ctx)
    expect(res.status).toBe(409)
  })

  // The regression that drove this rework: a sibling sub-tab (palette/music/meta)
  // saved, bumping the row — but the SECTIONS are untouched. The old timestamp
  // guard 409'd here ("tab lain terbuka") even with a single tab. It must not.
  it('does NOT 409 when only non-section keys changed since load (sibling sub-tab save)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const stored = {
      sections: validConfig.sections, // unchanged
      music: { url: 'changed-in-music-tab.mp3' }, // a sub-tab moved this on
      theme: { defaultPalette: 'rose' }, // ...and this
    }
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: stored, updated_at: 'T2-newer' } }, update: {} } } }) as any,
    )
    const res = await PUT(put({ config: validConfig, baseSectionsHash: matchingHash }), ctx)
    expect(res.status).toBe(200)
  })

  it('does NOT 409 when sections are byte-identical but the row was rewritten', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: { sections: validConfig.sections }, updated_at: 'T9' } }, update: {} } } }) as any,
    )
    const res = await PUT(put({ config: validConfig, baseSectionsHash: matchingHash }), ctx)
    expect(res.status).toBe(200)
  })

  it('skips the concurrency check entirely when no baseSectionsHash is sent (older client)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({ tables: { invitations: { select: { data: { config: { sections: [{ id: 'x', type: 'hero', props: {} }] }, updated_at: 'T2' } }, update: {} } } }) as any,
    )
    const res = await PUT(put({ config: validConfig }), ctx)
    expect(res.status).toBe(200)
  })

  it('happy path: saves, preserves other-tab keys (music) from the DB row, and echoes sectionsHash', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = createFakeSupabase({
      tables: {
        invitations: {
          select: { data: { config: { sections: validConfig.sections, music: { url: 'real.mp3' }, theme: { defaultPalette: 'gold' } }, updated_at: 'T1' } },
          update: {},
        },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    // Editor payload tries to write a STALE music value — route must ignore it.
    const res = await PUT(put({ config: { ...validConfig, music: { url: 'STALE.mp3' } }, baseSectionsHash: matchingHash }), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    // The echoed fingerprint lets the editor adopt the new baseline.
    expect(json.sectionsHash).toBe(hashSections(validConfig.sections))
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.music.url).toBe('real.mp3') // preserved from DB, not the editor payload
  })

  // The set_updated_at() trigger overwrites updated_at with the DB clock on every
  // write, so the value the route SET is not what gets stored. The route must
  // echo back the row's REAL post-write timestamp as savedAt for the "Saved HH:MM"
  // display.
  it('returns the DB-stored updated_at (post-trigger) as savedAt, not its own clock', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const dbStored = '2026-06-26T10:00:00.654321+00:00'
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: {
          invitations: {
            select: { data: { config: { sections: validConfig.sections }, updated_at: '2026-06-26T09:00:00.000+00:00' } },
            // .update(...).select('updated_at').single() resolves the 'update' result.
            update: { data: { updated_at: dbStored } },
          },
        },
      }) as any,
    )
    const res = await PUT(put({ config: validConfig, baseSectionsHash: matchingHash }), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).savedAt).toBe(dbStored)
  })

  it('500 when the update fails', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(
      createFakeSupabase({
        tables: { invitations: { select: { data: { config: { sections: validConfig.sections }, updated_at: 'T1' } }, update: { error: { message: 'x' } } } },
      }) as any,
    )
    expect((await PUT(put({ config: validConfig, baseSectionsHash: matchingHash }), ctx)).status).toBe(500)
  })
})

describe('PUT /api/invitation/[slug]/config — server-side template policy', () => {
  const lovebirdsPrev = [
    { id: 'hero-1', type: 'hero', props: {} },
    { id: 'rsvp-1', type: 'rsvp', props: {} },
    { id: 'gift-1', type: 'weddingGift', props: {} },
    { id: 'footer-1', type: 'footer', props: {} },
  ]
  // The committee loaded these sections, so their baseline matches the DB.
  const prevHash = hashSections(lovebirdsPrev)
  function fakeWith(prev: any[]) {
    return createFakeSupabase({
      tables: {
        invitations: {
          select: { data: { config: { sections: prev }, updated_at: 'T1', template_id: 'lovebirds' } },
          update: {},
        },
      },
    })
  }

  it('422 when a crafted save drops a mandatory section (rsvp)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(fakeWith(lovebirdsPrev) as any)
    const noRsvp = { sections: lovebirdsPrev.filter((s) => s.type !== 'rsvp') }
    const res = await PUT(put({ config: noRsvp, baseSectionsHash: prevHash }), ctx)
    expect(res.status).toBe(422)
  })

  it('422 when a crafted save balloons the section count past the fixed count', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = fakeWith(lovebirdsPrev)
    mockAdmin.mockReturnValue(fake as any)
    const thirty = Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, type: 'ourStory', props: {} }))
    const attack = { sections: [...lovebirdsPrev, ...thirty] }
    const res = await PUT(put({ config: attack, baseSectionsHash: prevHash }), ctx)
    expect(res.status).toBe(422)
    // ...and nothing is written to the DB.
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'invitations')).toBe(false)
  })

  it('200 for a legitimate same-count reorder', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(fakeWith(lovebirdsPrev) as any)
    const reordered = { sections: [...lovebirdsPrev].reverse() }
    const res = await PUT(put({ config: reordered, baseSectionsHash: prevHash }), ctx)
    expect(res.status).toBe(200)
  })
})
