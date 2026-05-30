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

  const supabase = createSupabaseAdminClient()

  // Preserve config.music and config.bgGif — they're saved by dedicated
  // dashboard tabs via separate endpoints and editor save MUST NOT clobber
  // either of them.
  const { data: existing } = await (supabase.from('invitations') as any)
    .select('config')
    .eq('id', owner.id)
    .single()
  const mergedConfig: any = { ...config }
  if (existing?.config?.music !== undefined) mergedConfig.music = existing.config.music
  if (existing?.config?.bgGif !== undefined) mergedConfig.bgGif = existing.config.bgGif

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
