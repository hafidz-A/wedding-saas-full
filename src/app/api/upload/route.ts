import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import {
  BUCKET,
  ALLOWED_MIMES,
  ALLOWED_AUDIO_MIMES,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
  MAX_TOTAL_BYTES,
  imageSignatureMatches,
  audioSignatureMatches,
} from '@/lib/upload/media'

/**
 * POST /api/upload (multipart)
 * Form fields:
 *   - file: File
 *   - slug: string
 *
 * Verifies the per-slug session cookie owns the invitation, resolves it to
 * an id, and uploads to invitation-media/<id>/<timestamp>-<safe-name>.<ext>.
 * Returns the public URL.
 *
 * DEPRECATED for the browser: this proxies the bytes THROUGH the serverless
 * function, so it is capped at Vercel's 4.5 MB request-body limit (files
 * 4.5–12 MB fail in production even though the app allows up to 12 MB). New
 * client uploads go direct-to-Storage via /api/upload/sign + /api/upload/verify
 * (see src/editor/lib/uploadFile.ts). Kept for backward-compat / small payloads.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'upload', { windowMs: 60_000, max: 20 })
  if (limited) return limited

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const slug = String(form.get('slug') || '')
  const file = form.get('file')
  if (!slug || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing slug or file' }, { status: 400 })
  }

  // Ownership check via Supabase Auth session.
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const invitation = { id: owner.id }
  const supabase = createSupabaseAdminClient()

  // --- validate ---
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported mime: ${file.type}` }, { status: 400 })
  }
  const isAudio = ALLOWED_AUDIO_MIMES.has(file.type)
  const maxBytes = isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024)
    return NextResponse.json({ error: `File too large (max ${maxMb} MB)` }, { status: 400 })
  }

  // --- per-invitation storage quota ---
  // Sum the sizes already stored under this invitation's folder and refuse the
  // upload if adding this file would exceed the ceiling. Best-effort: a list
  // error fails OPEN (does not block the owner) — the abuse case we care about
  // is sustained growth, which this still bounds on the next successful list.
  try {
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET)
      .list(invitation.id, { limit: 1000 })
    const usedBytes = (existingFiles ?? []).reduce(
      (sum, f: any) => sum + (f?.metadata?.size ?? 0),
      0,
    )
    if (usedBytes + file.size > MAX_TOTAL_BYTES) {
      const maxMb = Math.round(MAX_TOTAL_BYTES / 1024 / 1024)
      return NextResponse.json(
        { error: `Kuota penyimpanan undangan penuh (maks ${maxMb} MB). Hapus media lama dulu.` },
        { status: 413 },
      )
    }
  } catch (e) {
    console.error('[upload quota] list failed (allowing):', e)
  }

  // --- upload ---
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  const path = `${invitation.id}/${Date.now()}-${safeName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Defense-in-depth: the declared MIME is client-controlled, so confirm the
  // actual file signature (magic bytes) matches. Blocks a polyglot / mislabeled
  // / arbitrary binary slipping in under an image or audio content-type.
  if (isAudio) {
    if (!audioSignatureMatches(bytes)) {
      return NextResponse.json({ error: 'File content does not look like a valid audio file' }, { status: 400 })
    }
  } else if (!imageSignatureMatches(file.type, bytes)) {
    return NextResponse.json({ error: 'File content does not match its image type' }, { status: 400 })
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (upErr) {
    console.error('[upload]', upErr)
    return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ ok: true, url: pub.publicUrl, path })
}
