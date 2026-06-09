import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { encryptField, decryptField } from '@/lib/crypto/app'

const ALLOWED_COLORS = new Set(['gold', 'coral', 'sky', 'emerald', 'purple'])
const RATE_LIMIT_MS = 30_000 // 30 seconds between submissions per slug

// In-memory per-slug last-submit timestamps. Resets on server restart,
// which is acceptable for a soft anti-spam rate limit on a small site.
const lastSubmitBySlug = new Map<string, number>()

/**
 * POST /api/guestbook
 * Body: { slug, name, message, color? }
 *
 * Public submit endpoint — no auth required. Auto-publishes the note
 * (is_approved: true) so it shows up immediately on the public page.
 * Rate-limited to 1 submission per 30 seconds per slug.
 */
export async function POST(req: Request) {
  // Cross-instance IP rate limit (the per-slug Map below is a best-effort
  // in-memory extra that does not survive serverless cold starts).
  const limited = await enforceRateLimit(req, 'guestbook', { windowMs: 60_000, max: 8 })
  if (limited) return limited

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = String(body?.slug || '').trim()
  const name = String(body?.name || '').trim()
  const message = String(body?.message || '').trim()
  const rawColor = String(body?.color || 'gold').trim()
  const color = ALLOWED_COLORS.has(rawColor) ? rawColor : 'gold'

  // Validation
  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  if (!name || name.length > 40) {
    return NextResponse.json({ error: 'Nama harus 1-40 karakter' }, { status: 400 })
  }
  if (!message || message.length > 240) {
    return NextResponse.json({ error: 'Pesan harus 1-240 karakter' }, { status: 400 })
  }

  // Rate limit
  const now = Date.now()
  const last = lastSubmitBySlug.get(slug)
  if (last && now - last < RATE_LIMIT_MS) {
    const waitMs = RATE_LIMIT_MS - (now - last)
    return NextResponse.json(
      { error: `Tunggu ${Math.ceil(waitMs / 1000)} detik sebelum kirim note lagi` },
      { status: 429 },
    )
  }

  const supabase = createSupabaseAdminClient()

  // Resolve slug → invitation_id (only for LIVE invitations: published AND paid).
  const { data: invitation } = (await supabase
    .from('invitations')
    .select('id, is_published, is_paid')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean } | null }

  if (!invitation || !invitation.is_published || !invitation.is_paid) {
    return NextResponse.json({ error: 'Undangan tidak ditemukan' }, { status: 404 })
  }

  // Insert note — auto-approved per project config (no manual moderation).
  const { data: inserted, error } = await (supabase.from('guestbook_notes') as any)
    .insert({
      invitation_id: invitation.id,
      guest_name_enc: encryptField(name),
      message_enc: encryptField(message),
      color,
      is_approved: true,
    })
    .select('id, guest_name_enc, message_enc, color, created_at')
    .single()

  if (error || !inserted) {
    console.error('[guestbook insert]', error)
    return NextResponse.json({ error: 'Gagal simpan note' }, { status: 500 })
  }

  lastSubmitBySlug.set(slug, now)

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    name: decryptField(inserted.guest_name_enc),
    message: decryptField(inserted.message_enc),
    color: inserted.color,
    createdAt: inserted.created_at,
  })
}
