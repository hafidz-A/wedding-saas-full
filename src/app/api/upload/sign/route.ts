import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import {
  BUCKET,
  ALLOWED_MIMES,
  MAX_TOTAL_BYTES,
  maxBytesFor,
  safeStoragePath,
} from '@/lib/upload/media'

/**
 * POST /api/upload/sign  (JSON: { slug, filename, contentType, size })
 *
 * Step 1 of the direct-to-Storage upload flow. The browser sends only the file
 * METADATA (not the bytes), we authorize it (ownership + declared mime + size +
 * per-invitation quota), then hand back a short-lived signed upload URL the
 * client PUTs the bytes to. This bypasses Vercel's 4.5 MB serverless
 * request-body cap that the legacy /api/upload proxy hit — the big file never
 * passes through this function.
 *
 * The bytes are validated for real (magic bytes) in /api/upload/verify AFTER
 * they land, since we never see them here.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'upload', { windowMs: 60_000, max: 20 })
  if (limited) return limited

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const slug = String(body.slug || '')
  const filename = String(body.filename || 'file')
  const contentType = String(body.contentType || '')
  const size = Number(body.size)
  if (!slug || !contentType || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'Missing slug, contentType, or size' }, { status: 400 })
  }

  // Ownership check via Supabase Auth session.
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // --- declared-type + size gate (authoritative content check is in /verify) ---
  if (!ALLOWED_MIMES.has(contentType)) {
    return NextResponse.json({ error: `Unsupported mime: ${contentType}` }, { status: 400 })
  }
  const maxBytes = maxBytesFor(contentType)
  if (size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024)
    return NextResponse.json({ error: `File too large (max ${maxMb} MB)` }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // --- per-invitation storage quota (best-effort, fails OPEN like legacy) ---
  try {
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET)
      .list(owner.id, { limit: 1000 })
    const usedBytes = (existingFiles ?? []).reduce(
      (sum, f: any) => sum + (f?.metadata?.size ?? 0),
      0,
    )
    if (usedBytes + size > MAX_TOTAL_BYTES) {
      const maxMb = Math.round(MAX_TOTAL_BYTES / 1024 / 1024)
      return NextResponse.json(
        { error: `Kuota penyimpanan undangan penuh (maks ${maxMb} MB). Hapus media lama dulu.` },
        { status: 413 },
      )
    }
  } catch (e) {
    console.error('[upload/sign quota] list failed (allowing):', e)
  }

  // --- issue signed upload URL scoped to this invitation's folder ---
  const path = safeStoragePath(owner.id, filename)
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[upload/sign]', error)
    return NextResponse.json({ error: error?.message || 'Could not create upload URL' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path: data.path, token: data.token })
}
