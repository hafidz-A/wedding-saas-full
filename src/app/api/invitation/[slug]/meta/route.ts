import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'

interface Ctx { params: { slug: string } }

const TITLE_MAX = 120
const DESC_MAX = 200
const IMAGE_MAX = 600

/**
 * PUT /api/invitation/[slug]/meta
 * Body: { title?: string, description?: string, ogImage?: string }
 * Owner-only. Updates config.meta.{title,description,ogImage} — the text and
 * thumbnail shown in the browser tab and the WhatsApp / social share preview
 * (og:title / og:description / og:image). Empty string clears a field (the
 * public page then falls back to the couple's name / a photo from the config).
 * At least one field must be present.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const hasTitle = typeof body?.title === 'string'
  const hasDesc = typeof body?.description === 'string'
  const hasImage = typeof body?.ogImage === 'string'
  if (!hasTitle && !hasDesc && !hasImage) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const title = hasTitle ? (body.title as string).replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) : undefined
  const description = hasDesc ? (body.description as string).replace(/\s+/g, ' ').trim().slice(0, DESC_MAX) : undefined
  const rawImage = hasImage ? (body.ogImage as string).trim().slice(0, IMAGE_MAX) : undefined
  // Only accept an http(s) URL (our upload endpoint returns a public one) or an
  // empty string (clears it). Reject anything else to avoid junk in og:image.
  if (hasImage && rawImage && !/^https?:\/\//i.test(rawImage)) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config').eq('id', owner.id).single()
  if (fetchErr || !row) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const cfg = { ...(row.config || {}) }
  cfg.meta = { ...(cfg.meta || {}) }
  if (hasTitle) cfg.meta.title = title
  if (hasDesc) cfg.meta.description = description
  if (hasImage) cfg.meta.ogImage = rawImage

  const savedAt = new Date().toISOString()
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: cfg, updated_at: savedAt }).eq('id', owner.id)
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true, savedAt, title, description, ogImage: rawImage })
}
