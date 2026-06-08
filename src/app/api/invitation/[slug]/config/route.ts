import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { encryptConfig } from '@/lib/crypto/config'

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
    .select('config')
    .eq('id', owner.id)
    .single()
  const mergedConfig: any = { ...config }
  for (const key of PRESERVE_KEYS) {
    if (existing?.config && key in existing.config) mergedConfig[key] = existing.config[key]
    else delete mergedConfig[key]
  }

  // Encrypt sensitive leaves (account numbers/names, whatsapp, email, phone)
  // before persisting. The editor loaded a decrypted config, so these arrive
  // as plaintext; encryptConfig wraps them as { enc } (idempotent).
  const encryptedConfig = encryptConfig(mergedConfig)

  const savedAt = new Date().toISOString()
  // Cast to any at from() to avoid Supabase 'never' inference on untyped schema
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: encryptedConfig as any, updated_at: savedAt })
    .eq('id', owner.id)

  if (error) {
    console.error('[config update]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt })
}
