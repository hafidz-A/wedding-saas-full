'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { BUCKET, ALLOWED_MIMES, maxBytesFor } from '@/lib/upload/media'
import {
  compressImageForUpload,
  isAudioMime,
  MAX_RAW_INPUT_BYTES,
  type CompressOptions,
} from '@/lib/upload/compress'

export interface UploadResult {
  url: string
}

/**
 * Passed straight through to compressImageForUpload() for the image branch
 * (see compress.ts for what each field means) — ignored for audio, which is
 * never compressed. Every current caller except MetaTab.tsx's og:image
 * upload omits this and gets the default WebP/2000px behaviour; do not add
 * new fields here without a caller that actually needs them.
 */
export type UploadOptions = CompressOptions

/**
 * Upload a media file for `slug` straight to Supabase Storage via a short-lived
 * signed upload URL, bypassing the Vercel 4.5 MB serverless request-body cap the
 * old server-proxy route (/api/upload) hit — the bytes never touch our function.
 *
 * Flow:
 *   0. compressImageForUpload(...) → browser re-encodes images (WebP, capped
 *      long edge) BEFORE anything is sent to the server. This has to happen
 *      here, client-side: the whole point of the signed-URL flow is that the
 *      bytes never route through a Vercel function, so a server-side
 *      compression step is not an option. Skipped for audio and pass-through
 *      cases (gif, already-small); see compress.ts for the exact rules.
 *   1. POST /api/upload/sign   → server authorizes (ownership/quota/limit) + signs.
 *      filename/contentType/size sent here describe the file AFTER step 0 —
 *      /sign uses them for quota accounting, so they must match what we're
 *      about to actually upload, not the original.
 *   2. uploadToSignedUrl(...)  → browser PUTs the (possibly compressed) bytes
 *      directly to Supabase.
 *   3. POST /api/upload/verify → server checks the stored file's real signature
 *      and re-enforces the size cap on the REAL stored bytes — compression
 *      is a client-side optimisation, never a substitute for that check.
 *
 * Throws Error(message) — in Bahasa where user-facing — on any failure, so
 * callers can surface `err.message`.
 */
export async function uploadFile(
  slug: string,
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  // Instant client-side guard on the DECLARED mime (the server re-checks the
  // real bytes authoritatively at /verify). Runs before compression — an
  // unsupported type (e.g. a PDF) should fail fast regardless of size.
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    throw new Error(`Format tidak didukung: ${file.type}`)
  }

  let uploadable: File = file
  let contentType = file.type

  if (isAudioMime(file.type)) {
    // Audio is never compressed, so its size cap is still enforced up front
    // exactly like before compression existed.
    const maxBytes = maxBytesFor(file.type)
    if (file.size > maxBytes) {
      throw new Error(`File terlalu besar (maks ${Math.round(maxBytes / 1024 / 1024)} MB)`)
    }
  } else {
    // Images are the whole reason compression exists: a 12 MB phone photo
    // must NOT be rejected here, before it's had a chance to shrink. Only a
    // generous pre-decode sanity ceiling applies at this point, to stop the
    // browser from trying to decode something absurd and OOMing the tab.
    if (file.size > MAX_RAW_INPUT_BYTES) {
      const maxMb = Math.round(MAX_RAW_INPUT_BYTES / 1024 / 1024)
      throw new Error(`File terlalu besar untuk diproses (maks ${maxMb} MB)`)
    }

    const compressed = await compressImageForUpload(file, opts)
    uploadable = compressed.file
    contentType = compressed.contentType

    // THIS is where the real 5 MB image cap now lives: enforced on the
    // COMPRESSED result, not the raw upload. It stays the authoritative
    // limit (and /api/upload/verify still re-checks the real stored bytes
    // server-side) — checking it post-compression is simply what lets a
    // big-but-compressible phone photo through instead of turning it away
    // for a problem compression just solved.
    const maxBytes = maxBytesFor(contentType)
    if (uploadable.size > maxBytes) {
      throw new Error(`File terlalu besar (maks ${Math.round(maxBytes / 1024 / 1024)} MB)`)
    }
  }

  // 1. Authorize + sign.
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      filename: uploadable.name,
      contentType,
      size: uploadable.size,
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
    .uploadToSignedUrl(path, token, uploadable, { contentType: contentType || undefined })
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
