import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'

interface Ctx { params: { slug: string } }

const ORNAMENT_TYPES = ['birds', 'butterflies', 'perched'] as const

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
  if (ornamentType !== undefined && !(ORNAMENT_TYPES as readonly string[]).includes(ornamentType)) {
    return NextResponse.json({ error: 'Invalid ornamentType' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config, template_id').eq('id', owner.id).single()
  if (fetchErr || !row) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  if (hasPalette && !isPaletteAllowedForTemplate(row.template_id, palette)) {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }

  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}) }
  if (hasPalette) cfg.theme.defaultPalette = palette
  if (hasOrnament) cfg.theme.ornamentType = ornamentType

  const savedAt = new Date().toISOString()
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: cfg, updated_at: savedAt }).eq('id', owner.id)
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    savedAt,
    ...(hasPalette ? { defaultPalette: palette } : {}),
    ...(hasOrnament ? { ornamentType } : {}),
  })
}
