import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptConfig, decryptConfig } from '@/lib/crypto/config'
import { validateSectionsAgainstPolicy } from '@/editor/templatePolicy'
import { hashSections } from '@/editor/lib/sectionsHash'

interface Ctx {
  params: { slug: string }
}

/**
 * PUT /api/invitation/[slug]/config
 * Body: { config: PageConfig }
 *
 * Owner-only. Writes the full `config` JSONB column for the invitation
 * identified by slug. Returns the savedAt timestamp on success.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params

  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const config = body?.config
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Missing or invalid config' }, { status: 400 })
  }
  if (!Array.isArray(config.sections)) {
    return NextResponse.json({ error: 'config.sections must be an array' }, { status: 400 })
  }

  // DoS guard: the config holds text + image URLs (not binary), so a real one is
  // well under this. Reject anything pathologically large before it hits the DB.
  if (JSON.stringify(config).length > 512 * 1024) {
    return NextResponse.json({ error: 'Config too large' }, { status: 413 })
  }

  const supabase = createSupabaseAdminClient()

  // Top-level config keys owned by dedicated dashboard tabs (Music, Palette,
  // Ornament, Meta, Guests) which save via their own endpoints. The section
  // editor loaded a config snapshot when the page opened, so it must NOT write
  // these back — that would revert a change made in another tab since load.
  // Always take them from the freshly-read DB row instead of the editor payload.
  const PRESERVE_KEYS = ['music', 'bgGif', 'theme', 'meta', 'inviteMessageTemplate']
  const { data: existing } = await (supabase.from('invitations') as any)
    .select('config, updated_at, template_id')
    .eq('id', owner.id)
    .single()

  // Optimistic concurrency — CONTENT-AWARE, not timestamp-based. The section
  // editor only owns `config.sections`, but four sibling sub-tabs (Palette /
  // Music / Meta / Ornament) write the SAME row and bump its `updated_at`. A
  // timestamp guard therefore fired a FALSE "another tab is open" 409 whenever a
  // sub-tab had saved — even with a single open tab, and even though those saves
  // can't touch sections. Instead, compare a fingerprint of the SECTIONS the
  // editor loaded against the sections stored now: reject only when the sections
  // themselves changed under us (a real conflict to clobber). Sub-tab saves never
  // change sections, so they're invisible here — no false conflict, cross-device
  // included, with no fragile cross-tab timestamp bookkeeping.
  //
  // Both sides hash DECRYPTED sections, so encrypted-at-rest leaves don't skew
  // the comparison. A missing baseSectionsHash (older client) skips the check.
  const baseSectionsHash = typeof body?.baseSectionsHash === 'string' ? body.baseSectionsHash : null
  const storedSections = existing?.config ? decryptConfig(existing.config)?.sections : null
  if (baseSectionsHash && hashSections(storedSections) !== baseSectionsHash) {
    return NextResponse.json(
      { error: 'Undangan ini sudah diubah dari tab atau perangkat lain. Muat ulang halaman dulu sebelum menyimpan.' },
      { status: 409 },
    )
  }

  // Re-enforce the template's structural policy server-side. The editor UI
  // already blocks these, but a crafted PUT must not be able to change the
  // fixed section count, exceed the section cap, or remove a locked anchor
  // (hero/footer, intro/sun).
  const violation = validateSectionsAgainstPolicy(
    existing?.template_id,
    config.sections,
    Array.isArray(existing?.config?.sections) ? existing.config.sections : null,
  )
  if (violation) {
    return NextResponse.json({ error: violation.message }, { status: 422 })
  }

  const mergedConfig: any = { ...config }
  for (const key of PRESERVE_KEYS) {
    if (existing?.config && key in existing.config) mergedConfig[key] = existing.config[key]
    else delete mergedConfig[key]
  }

  // Encrypt sensitive leaves (account numbers/names, whatsapp, email, phone)
  // before persisting. The editor loaded a decrypted config, so these arrive
  // as plaintext; encryptConfig wraps them as { enc } (idempotent).
  const encryptedConfig = encryptConfig(mergedConfig)

  const localNow = new Date().toISOString()
  // Cast to any at from() to avoid Supabase 'never' inference on untyped schema.
  // Read the row BACK after the write: a `set_updated_at()` BEFORE-UPDATE trigger
  // overwrites updated_at with the DB's now(), so the value we wrote is NOT what
  // ends up stored. We must echo the REAL stored timestamp as the client's next
  // baseline — otherwise its baseline is permanently a few ms behind the row and
  // the very next save trips the optimistic-concurrency guard (a false 409).
  const { data: updatedRow, error } = await (supabase.from('invitations') as any)
    .update({ config: encryptedConfig as any, updated_at: localNow })
    .eq('id', owner.id)
    .select('updated_at')
    .single()

  if (error) {
    console.error('[config update]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  const savedAt = updatedRow?.updated_at ?? localNow
  // Echo the fingerprint of the sections we just stored so the editor adopts it
  // as its next concurrency baseline (mergedConfig is plaintext — sections are
  // never in PRESERVE_KEYS, so this equals what the client sent).
  return NextResponse.json({ ok: true, savedAt, sectionsHash: hashSections(mergedConfig.sections) })
}
