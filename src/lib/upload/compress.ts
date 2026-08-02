'use client'

/**
 * Client-side image compression for the editor's upload pipeline.
 *
 * WHY this exists: every photo a couple uploads here is later served,
 * byte-for-byte unmodified, to every one of their wedding guests — one
 * invitation page can easily be viewed hundreds of times. A stock phone
 * photo routinely lands at 4-8 MB and 4032x3024px (iPhones/Androids don't
 * downsize on capture), which means the SAME 6 MB gets paid for in Supabase
 * Storage egress on every single guest pageview. Re-encoding to WebP and
 * capping the long edge at a display-realistic size is a ONE-TIME cost at
 * upload that pays for itself on the very next guest view — by far the
 * highest-leverage place to spend effort on the egress bill.
 *
 * This runs entirely in the browser (createImageBitmap + canvas.toBlob) so
 * the compressed bytes are what gets sent to the Supabase signed-URL upload
 * in uploadFile.ts. That upload path deliberately never routes bytes through
 * a Vercel function (see uploadFile.ts for why) — a server-side compression
 * step would defeat that, so this has to happen client-side, before /sign.
 *
 * File is split into:
 *   - pure decision/math helpers (no DOM/canvas) — unit-tested in
 *     __tests__/compress.test.ts
 *   - the actual browser encode function at the bottom, which is NOT
 *     unit-testable (vitest runs in a `node` environment with no canvas) and
 *     must be verified manually — see the compression report for the steps.
 */

import { ALLOWED_AUDIO_MIMES } from './media'

/** Output codec + quality. WebP 0.82 is a well-established sweet spot for
 * photographic content: visually close to the source while landing at a
 * fraction of an equivalent-quality JPEG's size. This is the DEFAULT output
 * format — most callers want it (every <img> tag on the public invitation
 * and in the editor has universal WebP support). One caller currently
 * overrides it: MetaTab.tsx's og:image upload requests JPEG instead, because
 * WhatsApp/Facebook's link-preview crawlers have unreliable-to-absent WebP
 * support and a WebP og:image risks the share preview rendering with no
 * image at all. See CompressOptions.outputMime. */
export const OUTPUT_MIME = 'image/webp'
export const OUTPUT_QUALITY = 0.82

/** Long-edge cap in pixels for the DEFAULT case (gallery/hero/general
 * photos). Nothing in the editor or a public invitation page ever displays a
 * photo larger than this — phones routinely shoot well past it, so anything
 * above the cap is pure waste at render size. Callers with a different
 * target (e.g. og:image, see OG_IMAGE_MAX_LONG_EDGE below) should pass an
 * explicit CompressOptions.maxLongEdge rather than this constant changing. */
export const MAX_LONG_EDGE = 2000

/**
 * Long-edge cap for an Open Graph / share-preview image specifically. The
 * de-facto convention for og:image (and Twitter Card) is ~1200x630 — a
 * share-preview thumbnail is never viewed anywhere near gallery resolution,
 * so there is no reason to keep it at the general MAX_LONG_EDGE. Exported as
 * its own named constant (rather than a bare `1200` at the MetaTab.tsx call
 * site) so the reasoning travels with the number.
 */
export const OG_IMAGE_MAX_LONG_EDGE = 1200

/** Below this size AND already inside MAX_LONG_EDGE, re-encoding would spend
 * CPU and a generation of quality loss for a saving too small to matter. */
export const SKIP_COMPRESS_BYTES = 300 * 1024 // 300 KB

/**
 * Pre-decode sanity ceiling on the RAW input, independent of (and much
 * looser than) the authoritative post-compression MAX_IMAGE_BYTES in
 * media.ts. This is not a "your file is too big" product limit — it exists
 * purely to stop the browser tab from trying to decode something absurd
 * (a mislabeled 80 MB TIFF, a corrupt file) into an ImageBitmap and OOMing
 * before compression even gets a chance to run.
 */
export const MAX_RAW_INPUT_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * Formats we deliberately never re-encode:
 *   - GIF: re-encoding to a static WebP would kill the animation.
 * (Audio is handled by isAudioMime — compressImageForUpload() is only ever
 * called from the image branch of uploadFile.ts, but the audio guard is
 * kept here too so this module stays safe to call defensively elsewhere.)
 */
export function isSkippedImageMime(mime: string): boolean {
  return mime === 'image/gif'
}

export function isAudioMime(mime: string): boolean {
  return ALLOWED_AUDIO_MIMES.has(mime)
}

/**
 * True when a file is already small AND already within the dimension cap,
 * so re-encoding it would not meaningfully help — the caller should skip
 * compression and upload the original bytes as-is. `maxLongEdge` defaults to
 * the general MAX_LONG_EDGE but accepts a caller-specific cap (e.g. the
 * og:image path) so the "already small enough" question is answered against
 * the right target, not always the gallery-photo one.
 */
export function isAlreadySmallEnough(
  sizeBytes: number,
  width: number,
  height: number,
  maxLongEdge: number = MAX_LONG_EDGE,
): boolean {
  return sizeBytes < SKIP_COMPRESS_BYTES && Math.max(width, height) <= maxLongEdge
}

/**
 * Target canvas dimensions for the long-edge cap. NEVER upscales: an image
 * already smaller than maxLongEdge keeps its original pixel dimensions,
 * since scaling up only spends bytes on interpolated detail that was never
 * in the source.
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxLongEdge: number = MAX_LONG_EDGE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width, height }
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height } // already within cap — no upscale
  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Rewrite a filename's extension to match the ACTUAL output mime, so the
 * stored path is honest about its own content — a HEIC-named file that got
 * compressed to WebP should end up `foto.HEIC.webp`, not a WebP file wearing
 * a `.HEIC` name. Only the extension changes; safeStoragePath() (media.ts)
 * separately sanitises the whole base name. Mimes we don't rewrite for
 * (e.g. the original was passed through untouched) return the name as-is.
 */
export function rewriteFilenameExtension(filename: string, outputMime: string): string {
  const ext = outputMime === 'image/webp' ? 'webp' : outputMime === 'image/jpeg' ? 'jpg' : null
  if (!ext) return filename
  const dot = filename.lastIndexOf('.')
  const base = dot > 0 ? filename.slice(0, dot) : filename
  return `${base}.${ext}`
}

/**
 * Never let a "compressed" result win if it is not actually smaller — some
 * already-optimized source images (a pre-squeezed JPEG, a tiny PNG) can lose
 * to a fresh WebP re-encode. Compares by size only; the caller decides which
 * concrete objects `a`/`b` represent.
 */
export function pickSmaller<T extends { size: number }>(original: T, candidate: T): T {
  return candidate.size < original.size ? candidate : original
}

/** The two output codecs compressImageForUpload() knows how to target. */
export type CompressOutputMime = 'image/webp' | 'image/jpeg'

export interface CompressOptions {
  /** Requested output codec. Defaults to OUTPUT_MIME (WebP) — pass
   * 'image/jpeg' for a consumer with weak/no WebP support (e.g. the
   * og:image path, whose consumers are WhatsApp/Facebook link-preview
   * crawlers, not a browser <img> tag). Anything other than 'image/jpeg' is
   * treated as "use the default", so an unrecognised value fails safe. */
  outputMime?: CompressOutputMime
  /** Long-edge cap in pixels for THIS call. Defaults to MAX_LONG_EDGE. */
  maxLongEdge?: number
  /**
   * When true, always re-encode — even if the source already passes
   * isAlreadySmallEnough(), and even if the freshly-encoded result is not
   * smaller than the source. Normal compression is a pure bandwidth
   * optimisation, so both of those cases correctly prefer "leave the
   * original alone". But when a caller's whole point is guaranteeing the
   * OUTPUT FORMAT (e.g. og:image must never be WebP), skipping re-encode on
   * a small source would leave that source's original format — which could
   * itself be WebP or PNG — untouched, silently defeating the guarantee.
   */
  forceReencode?: boolean
}

interface ResolvedCompressOptions {
  outputMime: CompressOutputMime
  maxLongEdge: number
  forceReencode: boolean
}

/**
 * Fill in defaults for compressImageForUpload()'s options. Pure and
 * unit-tested (no DOM/canvas involved) — the actual encode function below
 * calls this first thing so every downstream decision reads from one
 * resolved, fully-defaulted object instead of repeating `?? DEFAULT` checks.
 */
export function resolveCompressOptions(opts: CompressOptions = {}): ResolvedCompressOptions {
  return {
    outputMime: opts.outputMime === 'image/jpeg' ? 'image/jpeg' : OUTPUT_MIME,
    maxLongEdge: typeof opts.maxLongEdge === 'number' && opts.maxLongEdge > 0
      ? opts.maxLongEdge
      : MAX_LONG_EDGE,
    forceReencode: opts.forceReencode === true,
  }
}

// ---------------------------------------------------------------------------
// Browser-only encode path (createImageBitmap / canvas / toBlob). Not
// exercised by unit tests — vitest's `node` environment has no canvas. See
// the compression report for the manual verification steps.
// ---------------------------------------------------------------------------

export interface CompressResult {
  file: File
  contentType: string
}

function isOffscreenCanvas(c: unknown): c is OffscreenCanvas {
  return typeof OffscreenCanvas !== 'undefined' && c instanceof OffscreenCanvas
}

/** Encode a canvas to a Blob at the given mime/quality, using whichever of
 * OffscreenCanvas.convertToBlob / HTMLCanvasElement.toBlob the canvas
 * supports. Resolves null (never rejects) on failure so the caller can fall
 * back to the original file. */
function encodeCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  if (isOffscreenCanvas(canvas)) {
    return canvas.convertToBlob({ type: mime, quality }).catch(() => null)
  }
  return new Promise((resolve) => {
    try {
      ;(canvas as HTMLCanvasElement).toBlob((blob) => resolve(blob), mime, quality)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Compress an image File for upload. Fails OPEN on every error path: any
 * decode/encode failure, or a missing browser API, logs a warning and
 * resolves to the ORIGINAL file untouched — compression is a bandwidth
 * optimisation, it must never be the reason a user's upload gets blocked.
 *
 * `opts` lets a specific caller override the output format / size target —
 * see CompressOptions. The default (no opts) is what every image field in
 * the editor uses; MetaTab.tsx's og:image upload is the one caller that
 * currently overrides outputMime/maxLongEdge/forceReencode.
 */
export async function compressImageForUpload(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const original: CompressResult = { file, contentType: file.type }
  const { outputMime, maxLongEdge, forceReencode } = resolveCompressOptions(opts)

  if (isAudioMime(file.type) || isSkippedImageMime(file.type)) return original
  if (typeof createImageBitmap !== 'function') return original // very old browser, no support

  let bitmap: ImageBitmap | null = null
  try {
    // imageOrientation: 'from-image' is load-bearing, not a default we can
    // skip. Drawing to a canvas strips EXIF entirely, so a portrait iPhone
    // photo — which stores its pixels landscape plus an EXIF rotation tag —
    // would come out sideways for every guest unless the rotation is baked
    // into the pixels HERE, at decode time, before the canvas ever sees it.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const srcW = bitmap.width
    const srcH = bitmap.height
    if (!forceReencode && isAlreadySmallEnough(file.size, srcW, srcH, maxLongEdge)) {
      return original
    }

    const { width, height } = computeTargetDimensions(srcW, srcH, maxLongEdge)

    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : document.createElement('canvas')
    if (!isOffscreenCanvas(canvas)) {
      canvas.width = width
      canvas.height = height
    }
    const ctx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null
    if (!ctx) return original

    // Plain drawImage — no manual alpha handling needed. WebP's lossy mode
    // still encodes an alpha channel, so a transparent PNG survives the
    // round trip; we just don't want to accidentally flatten it onto a
    // background, which drawImage doesn't do by default.
    ctx.drawImage(bitmap, 0, 0, width, height)

    let blob = await encodeCanvas(canvas, outputMime, OUTPUT_QUALITY)
    // toBlob/convertToBlob silently substitute a different format on
    // browsers without encode support for the requested mime — trust what
    // we actually got back, not what we asked for, and explicitly re-encode
    // as JPEG rather than accepting whatever the browser's own fallback
    // happened to be (JPEG encode support is universal, so this is the safe
    // floor regardless of whether the request was for WebP or JPEG).
    let actualMime: string | undefined = blob?.type
    if (!blob || actualMime !== outputMime) {
      blob = await encodeCanvas(canvas, 'image/jpeg', OUTPUT_QUALITY)
      actualMime = 'image/jpeg'
    }
    if (!blob) return original

    const compressedFile = new File([blob], rewriteFilenameExtension(file.name, actualMime), {
      type: actualMime,
      lastModified: file.lastModified,
    })

    // Normal case: never return something worse than the original. Skipped
    // under forceReencode, whose whole point is guaranteeing the OUTPUT
    // FORMAT (see CompressOptions.forceReencode) — a few extra bytes lost
    // that way is an acceptable trade for e.g. og:image never being WebP.
    if (!forceReencode && compressedFile.size >= file.size) return original
    return { file: compressedFile, contentType: actualMime }
  } catch (err) {
    console.warn('[compressImageForUpload] decode/encode failed, uploading original:', err)
    return original
  } finally {
    bitmap?.close()
  }
}
