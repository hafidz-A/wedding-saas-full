import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { parseYouTubeId } from '@/lib/music/source'
import { safeExternalUrl } from '@/lib/safeUrl'

interface Ctx {
  params: { slug: string }
}

/**
 * PUT /api/invitation/[slug]/music
 * Body: { music: MusicSettings | null }
 *
 * Owner-only. Updates ONLY the `music` key inside the invitation's config
 * JSONB — preserves the rest of config (meta, sections). This isolation
 * lets the dashboard "Music" tab save without conflicting with unsaved
 * changes in the "Editor" tab.
 *
 * Passing `music: null` clears the setting (popup will not appear).
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

  const incoming = body?.music
  const sanitized = incoming === null
    ? null
    : typeof incoming === 'object'
      ? sanitizeMusic(incoming)
      : null

  const supabase = createSupabaseAdminClient()

  // Fetch current config so we can merge music into it.
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config')
    .eq('id', owner.id)
    .single()

  if (fetchErr || !row) {
    console.error('[music update fetch]', fetchErr)
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  const nextConfig = { ...(row.config || {}) }
  if (sanitized === null) {
    delete nextConfig.music
  } else {
    nextConfig.music = sanitized
  }

  const savedAt = new Date().toISOString()
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: nextConfig, updated_at: savedAt })
    .eq('id', owner.id)

  if (error) {
    console.error('[music update write]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt, music: sanitized })
}

const VALID_SOURCES = new Set(['upload', 'url', 'youtube', 'library'])

function sanitizeMusic(input: any) {
  const trimText = (v: any, max = 60) =>
    typeof v === 'string' ? v.trim().slice(0, max) : undefined

  // Source resolution: trust an explicit valid `source`, otherwise infer from
  // whichever field is present. YouTube stores a parsed id; the rest store an
  // http(s) url (rejecting javascript:/data: and other unsafe schemes).
  let source: string | undefined =
    typeof input.source === 'string' && VALID_SOURCES.has(input.source) ? input.source : undefined
  let url = ''
  let youtubeId: string | undefined

  const looksYouTube = !!(input.youtubeId || parseYouTubeId(input.url))
  if (source === 'youtube' || (!source && looksYouTube)) {
    source = 'youtube'
    youtubeId = parseYouTubeId(input.youtubeId || input.url) || undefined
  } else {
    const raw = typeof input.url === 'string' ? input.url.trim() : ''
    const safe = safeExternalUrl(raw)
    url = /^https?:\/\//i.test(safe) ? safe : ''
    if (!source) source = url ? 'url' : undefined
  }

  return {
    ...(source ? { source } : {}),
    url,
    ...(youtubeId ? { youtubeId } : {}),
    enabled: input.enabled !== false,
    title: trimText(input.title) || 'Putar musik latar?',
    subtitle: trimText(input.subtitle, 120) || 'Nikmati pengalaman undangan lebih lengkap',
    acceptLabel: trimText(input.acceptLabel, 20) || 'Putar',
    dismissLabel: trimText(input.dismissLabel, 20) || 'Nanti',
    loop: input.loop !== false,
  }
}
