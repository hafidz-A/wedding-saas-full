import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'
import { isOrnamentAllowedForTemplate } from '@/lib/templates/appearance'

interface Ctx { params: { slug: string } }

/**
 * PUT /api/invitation/[slug]/theme
 * Body: { defaultPalette?: string, ornamentType?: string }
 * Owner-only. Updates config.theme fields (palette and/or ornamentType).
 * At least one field must be present.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const palette = body?.defaultPalette
  const ornamentType = body?.ornamentType

  const hasPalette = typeof palette === 'string'
  const hasOrnament = ornamentType !== undefined

  if (!hasPalette && !hasOrnament) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config, template_id').eq('id', owner.id).single()
  if (fetchErr || !row) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  if (hasPalette && !isPaletteAllowedForTemplate(row.template_id, palette)) {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }
  // Ornament validation needs the template id, so it moves below the row
  // fetch — this closes a real hole: without it, Solary could be handed
  // ornamentType: 'birds' and would silently store it.
  if (hasOrnament && !isOrnamentAllowedForTemplate(row.template_id, ornamentType)) {
    return NextResponse.json({ error: 'Invalid ornamentType' }, { status: 400 })
  }

  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}) }
  if (hasPalette) cfg.theme.defaultPalette = palette
  if (hasOrnament) cfg.theme.ornamentType = ornamentType

  const localNow = new Date().toISOString()
  // Echo the REAL stored updated_at back (the set_updated_at() trigger overwrites
  // it with the DB clock), so an open section editor can rebase its concurrency
  // baseline to the correct value instead of this route's slightly-earlier clock.
  const { data: updatedRow, error } = await (supabase.from('invitations') as any)
    .update({ config: cfg, updated_at: localNow }).eq('id', owner.id)
    .select('updated_at').single()
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    savedAt: updatedRow?.updated_at ?? localNow,
    ...(hasPalette ? { defaultPalette: palette } : {}),
    ...(hasOrnament ? { ornamentType } : {}),
  })
}
