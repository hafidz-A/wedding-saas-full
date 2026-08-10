import { NextResponse } from 'next/server'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { sniffMediaKind, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '@/lib/upload/media'
import { getObjectHead, deleteObject, publicUrl } from '@/lib/upload/r2'

/**
 * POST /api/upload/verify  (JSON: { slug, path })
 *
 * Step 3 of the direct-to-Storage upload flow. The bytes never passed through
 * our serverless function (they went straight to R2 via a presigned URL), so
 * this is where we do the defense-in-depth signature check the legacy proxy did
 * inline: pull the head of the stored object, confirm it really looks like an
 * allowed image/audio container, and DELETE it if it doesn't (polyglot /
 * mislabeled / arbitrary binary). Returns the public URL on success.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'upload', { windowMs: 60_000, max: 20 })
  if (limited) return limited

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const slug = String(body.slug || '')
  const path = String(body.path || '')
  if (!slug || !path) return NextResponse.json({ error: 'Missing slug or path' }, { status: 400 })

  // Ownership check via Supabase Auth session.
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // IDOR guard: the path MUST live under THIS invitation's own folder, else an
  // owner could verify (and, on a bad signature, DELETE) another invitation's
  // media by passing a crafted path.
  if (!path.startsWith(`${owner.id}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Pull only the head bytes — a Range request, not the whole object the way the
  // Supabase implementation had to.
  const head = await getObjectHead(path, 32)
  if (!head) {
    return NextResponse.json({ error: 'Uploaded file not found' }, { status: 404 })
  }

  // Trust the actual bytes, not the client-declared content-type.
  const kind = sniffMediaKind(head.bytes)
  if (!kind) {
    await deleteObject(path)
    return NextResponse.json(
      { error: 'File content does not look like a valid image or audio file' },
      { status: 400 },
    )
  }

  // Authoritative size enforcement on the REAL stored bytes. The /sign step only
  // saw a client-DECLARED size (bypassable by a crafted request), and the signed
  // URL itself does not cap the payload — so this is where the 12 MB audio /
  // 5 MB image ceiling is actually enforced. Over-limit → delete + reject.
  const maxBytes = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
  if (head.size > maxBytes) {
    await deleteObject(path)
    const maxMb = Math.round(maxBytes / 1024 / 1024)
    return NextResponse.json(
      { error: `File terlalu besar (maks ${maxMb} MB) — upload dibatalkan.` },
      { status: 413 },
    )
  }

  return NextResponse.json({ ok: true, url: publicUrl(path), path })
}
