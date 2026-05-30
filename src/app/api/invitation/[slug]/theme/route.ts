import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'

interface Ctx { params: { slug: string } }

const ALLOWED_PALETTES = new Set([
  'cosmicDark', 'nebulaDark', 'roseDark', 'emeraldDark',
  'lavenderLight', 'sunburstLight', 'roseLight', 'botanicalLight',
])

/**
 * PUT /api/invitation/[slug]/theme
 * Body: { defaultPalette: string }
 * Owner-only. Updates config.theme.defaultPalette only (isolated like /background).
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const palette = body?.defaultPalette
  if (typeof palette !== 'string' || !ALLOWED_PALETTES.has(palette)) {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config').eq('id', owner.id).single()
  if (fetchErr || !row) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}), defaultPalette: palette }

  const savedAt = new Date().toISOString()
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: cfg, updated_at: savedAt }).eq('id', owner.id)
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true, savedAt, defaultPalette: palette })
}
