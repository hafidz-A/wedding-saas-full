import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const BUCKET = 'invitation-media'
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const ALLOWED_AUDIO_MIMES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4'])
const ALLOWED_MIMES = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_AUDIO_MIMES])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_AUDIO_BYTES = 12 * 1024 * 1024 // 12 MB

/**
 * POST /api/upload (multipart)
 * Form fields:
 *   - file: File
 *   - slug: string
 *
 * Verifies the per-slug session cookie owns the invitation, resolves it to
 * an id, and uploads to invitation-media/<id>/<timestamp>-<safe-name>.<ext>.
 * Returns the public URL.
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

  // --- upload ---
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  const path = `${invitation.id}/${Date.now()}-${safeName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Defense-in-depth: the declared MIME is client-controlled, so for images
  // confirm the actual file signature (magic bytes) matches. Blocks a polyglot
  // / mislabeled file slipping in under an image content-type.
  if (!isAudio && !imageSignatureMatches(file.type, bytes)) {
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

/** Verify a buffer's leading bytes match the declared image MIME type. */
function imageSignatureMatches(mime: string, b: Uint8Array): boolean {
  const at = (i: number) => b[i]
  switch (mime) {
    case 'image/jpeg':
      return at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff
    case 'image/png':
      return at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47
    case 'image/gif':
      // "GIF8"
      return at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38
    case 'image/webp':
      // "RIFF" .... "WEBP"
      return (
        at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
        at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
      )
    default:
      return false
  }
}
