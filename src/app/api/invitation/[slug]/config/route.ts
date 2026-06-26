import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptConfig } from '@/lib/crypto/config'
import { validateSectionsAgainstPolicy } from '@/editor/templatePolicy'

interface Ctx {
  params: { slug: string }
}

/**
 * True only when the DB row is a STRICTLY NEWER write than the baseline the
 * editor loaded — i.e. a real concurrent edit to clobber.
 *
 * Compares INSTANTS, not raw strings. The client echoes its baseline back as a
 * `new Date().toISOString()` value (`…Z`, ms precision), while Postgres/PostgREST
 * returns `updated_at` as a different serialization of the same instant
 * (`…+00:00`, µs precision). A raw `!==` treated those as a conflict and falsely
 * blocked every save after the first. Parsing to epoch ms makes equal instants
 * compare equal regardless of zone notation or sub-ms padding.
 *
 * Falls back to exact string compare when either value isn't a parseable date
 * (defensive — keeps deterministic behaviour for non-ISO tokens).
 */
function isStaleWrite(base: string, current: string): boolean {
  const b = Date.parse(base)
  const c = Date.parse(current)
  if (Number.isNaN(b) || Number.isNaN(c)) return base !== current
  return c > b
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

  // Optimistic concurrency: if the editor sent the updated_at it loaded with,
  // and the row has been written since (another tab/device), reject rather than
  // silently clobber the newer sections. The client surfaces this as a "reload"
  // prompt. A missing baseUpdatedAt (older client) skips the check — no regression.
  const baseUpdatedAt = typeof body?.baseUpdatedAt === 'string' ? body.baseUpdatedAt : null
  if (baseUpdatedAt && existing?.updated_at && isStaleWrite(baseUpdatedAt, existing.updated_at)) {
    return NextResponse.json(
      { error: 'Undangan ini sudah diubah dari tab atau perangkat lain. Muat ulang halaman dulu sebelum menyimpan.' },
      { status: 409 },
    )
  }

  // Re-enforce the template's structural policy server-side. The editor UI
  // already blocks these, but a crafted PUT must not be able to drop a mandatory
  // RSVP/Gift section, exceed the section cap, or remove a locked anchor.
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
  return NextResponse.json({ ok: true, savedAt })
}
