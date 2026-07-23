'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { BUCKET, ALLOWED_MIMES, maxBytesFor } from '@/lib/upload/media'

export interface UploadResult {
  url: string
}

/**
 * Upload a media file for `slug` straight to Supabase Storage via a short-lived
 * signed upload URL, bypassing the Vercel 4.5 MB serverless request-body cap the
 * old server-proxy route (/api/upload) hit — the bytes never touch our function.
 *
 * Flow:
 *   1. POST /api/upload/sign   → server authorizes (ownership/quota/limit) + signs
 *   2. uploadToSignedUrl(...)  → browser PUTs the bytes directly to Supabase
 *   3. POST /api/upload/verify → server checks the stored file's real signature
 *
 * Throws Error(message) — in Bahasa where user-facing — on any failure, so
 * callers can surface `err.message`.
 */
export async function uploadFile(slug: string, file: File): Promise<UploadResult> {
  // Instant client-side guard (the server re-checks both authoritatively).
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    throw new Error(`Format tidak didukung: ${file.type}`)
  }
  const maxBytes = maxBytesFor(file.type)
  if (file.size > maxBytes) {
    throw new Error(`File terlalu besar (maks ${Math.round(maxBytes / 1024 / 1024)} MB)`)
  }

  // 1. Authorize + sign.
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })
  if (!signRes.ok) {
    const e = await signRes.json().catch(() => ({}))
    throw new Error(e.error || `Gagal menyiapkan upload (${signRes.status})`)
  }
  const { path, token } = await signRes.json()

  // 2. Upload the bytes DIRECTLY to Supabase Storage (no size cap from Vercel).
  const supabase = createSupabaseBrowserClient()
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined })
  if (upErr) throw new Error(upErr.message || 'Upload ke penyimpanan gagal')

  // 3. Verify the stored file is really an allowed image/audio (deletes if not).
  const verifyRes = await fetch('/api/upload/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, path }),
  })
  if (!verifyRes.ok) {
    const e = await verifyRes.json().catch(() => ({}))
    throw new Error(e.error || `Verifikasi file gagal (${verifyRes.status})`)
  }
  const { url } = await verifyRes.json()
  return { url }
}
