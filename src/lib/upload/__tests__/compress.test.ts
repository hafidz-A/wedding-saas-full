import { describe, it, expect } from 'vitest'
import {
  isSkippedImageMime,
  isAudioMime,
  isAlreadySmallEnough,
  computeTargetDimensions,
  rewriteFilenameExtension,
  pickSmaller,
  resolveCompressOptions,
  SKIP_COMPRESS_BYTES,
  MAX_LONG_EDGE,
  OUTPUT_MIME,
  OG_IMAGE_MAX_LONG_EDGE,
} from '../compress'

// NOTE: compressImageForUpload() itself (createImageBitmap + canvas.toBlob)
// is deliberately NOT unit-tested here — vitest runs these tests in a `node`
// environment with no canvas/DOM, so any assertion about its output would be
// testing a mock, not real browser encode behaviour. Only the pure
// decision/math helpers below are covered; the browser encode path is meant
// to be verified manually (see the compression report's manual test steps).

describe('isSkippedImageMime', () => {
  it('flags GIF (animation would break on re-encode)', () => {
    expect(isSkippedImageMime('image/gif')).toBe(true)
  })
  it('does not flag static image formats', () => {
    expect(isSkippedImageMime('image/jpeg')).toBe(false)
    expect(isSkippedImageMime('image/png')).toBe(false)
    expect(isSkippedImageMime('image/webp')).toBe(false)
  })
})

describe('isAudioMime', () => {
  it('flags every allowed audio mime', () => {
    expect(isAudioMime('audio/mpeg')).toBe(true)
    expect(isAudioMime('audio/mp3')).toBe(true)
    expect(isAudioMime('audio/wav')).toBe(true)
    expect(isAudioMime('audio/ogg')).toBe(true)
    expect(isAudioMime('audio/aac')).toBe(true)
    expect(isAudioMime('audio/x-m4a')).toBe(true)
    expect(isAudioMime('audio/mp4')).toBe(true)
  })
  it('does not flag image mimes or empty string', () => {
    expect(isAudioMime('image/jpeg')).toBe(false)
    expect(isAudioMime('')).toBe(false)
  })
})

describe('isAlreadySmallEnough (skip-compression decision)', () => {
  it('skips a small file already within the dimension cap', () => {
    expect(isAlreadySmallEnough(SKIP_COMPRESS_BYTES - 1, 1200, 800)).toBe(true)
  })
  it('does NOT skip a small file that exceeds the dimension cap', () => {
    // e.g. a heavily-compressed but oversized screenshot
    expect(isAlreadySmallEnough(100 * 1024, MAX_LONG_EDGE + 500, 900)).toBe(false)
  })
  it('does NOT skip a large file even if dimensions are within the cap', () => {
    expect(isAlreadySmallEnough(2 * 1024 * 1024, 1200, 800)).toBe(false)
  })
  it('treats the size boundary as exclusive (>= SKIP_COMPRESS_BYTES compresses)', () => {
    expect(isAlreadySmallEnough(SKIP_COMPRESS_BYTES, 100, 100)).toBe(false)
  })
  it('treats the dimension boundary as inclusive (exactly MAX_LONG_EDGE skips)', () => {
    expect(isAlreadySmallEnough(1000, MAX_LONG_EDGE, 500)).toBe(true)
  })
  it('honours a caller-specific maxLongEdge (e.g. the og:image 1200px cap) instead of the default', () => {
    // 1500px is within the general 2000px cap but NOT within og:image's 1200px cap.
    expect(isAlreadySmallEnough(50 * 1024, 1500, 800, OG_IMAGE_MAX_LONG_EDGE)).toBe(false)
    expect(isAlreadySmallEnough(50 * 1024, 1000, 800, OG_IMAGE_MAX_LONG_EDGE)).toBe(true)
  })
})

describe('computeTargetDimensions (long-edge cap, never upscale)', () => {
  it('downscales a landscape image whose width is the long edge', () => {
    // 4032x3024 (typical iPhone landscape) -> long edge 4032 capped to 2000
    expect(computeTargetDimensions(4032, 3024)).toEqual({ width: 2000, height: 1500 })
  })
  it('downscales a portrait image whose height is the long edge', () => {
    // 3024x4032 (typical iPhone portrait, after EXIF-orientation-corrected decode)
    expect(computeTargetDimensions(3024, 4032)).toEqual({ width: 1500, height: 2000 })
  })
  it('never upscales an image already under the cap', () => {
    expect(computeTargetDimensions(800, 600)).toEqual({ width: 800, height: 600 })
  })
  it('leaves an image exactly at the cap untouched', () => {
    expect(computeTargetDimensions(2000, 1000)).toEqual({ width: 2000, height: 1000 })
  })
  it('handles a square image over the cap', () => {
    expect(computeTargetDimensions(3000, 3000)).toEqual({ width: 2000, height: 2000 })
  })
  it('respects a custom maxLongEdge', () => {
    expect(computeTargetDimensions(2000, 1000, 1000)).toEqual({ width: 1000, height: 500 })
  })
  it('is defensive against zero/invalid dimensions (returns them unchanged rather than NaN)', () => {
    expect(computeTargetDimensions(0, 0)).toEqual({ width: 0, height: 0 })
  })
  it('caps a landscape source to the og:image 1200px target', () => {
    // typical hero photo 4032x3024 downscaled for an og:image, not gallery use
    expect(computeTargetDimensions(4032, 3024, OG_IMAGE_MAX_LONG_EDGE)).toEqual({
      width: 1200,
      height: 900,
    })
  })
})

describe('rewriteFilenameExtension', () => {
  it('rewrites a .jpg name to .webp for the webp output mime', () => {
    expect(rewriteFilenameExtension('foto.jpg', 'image/webp')).toBe('foto.webp')
  })
  it('preserves a dotted base name and only swaps the final extension', () => {
    // e.g. an iPhone HEIC file whose apparent extension is .HEIC.jpg
    expect(rewriteFilenameExtension('foto.HEIC.jpg', 'image/webp')).toBe('foto.HEIC.webp')
  })
  it('rewrites to .jpg for the jpeg fallback output mime', () => {
    expect(rewriteFilenameExtension('foto.png', 'image/jpeg')).toBe('foto.jpg')
  })
  it('leaves the filename unchanged for a mime it does not rewrite for', () => {
    expect(rewriteFilenameExtension('clip.mp3', 'audio/mpeg')).toBe('clip.mp3')
  })
  it('handles a filename with no extension', () => {
    expect(rewriteFilenameExtension('foto', 'image/webp')).toBe('foto.webp')
  })
  it('handles a leading dot (hidden-file-style name) without eating the whole name', () => {
    expect(rewriteFilenameExtension('.foto', 'image/webp')).toBe('.foto.webp')
  })
})

describe('pickSmaller', () => {
  it('picks the compressed candidate when it is smaller', () => {
    const original = { size: 5_000_000 }
    const candidate = { size: 1_200_000 }
    expect(pickSmaller(original, candidate)).toBe(candidate)
  })
  it('falls back to the original when the candidate is not actually smaller', () => {
    const original = { size: 200_000 }
    const candidate = { size: 250_000 } // a fresh re-encode that lost to an already-tight source
    expect(pickSmaller(original, candidate)).toBe(original)
  })
  it('falls back to the original on an exact tie', () => {
    const original = { size: 100 }
    const candidate = { size: 100 }
    expect(pickSmaller(original, candidate)).toBe(original)
  })
})

describe('resolveCompressOptions (option-plumbing defaults for compressImageForUpload)', () => {
  it('defaults to WebP, MAX_LONG_EDGE, and forceReencode=false when called with no options', () => {
    expect(resolveCompressOptions()).toEqual({
      outputMime: OUTPUT_MIME,
      maxLongEdge: MAX_LONG_EDGE,
      forceReencode: false,
    })
  })
  it('defaults the same way for an explicit empty options object', () => {
    expect(resolveCompressOptions({})).toEqual({
      outputMime: OUTPUT_MIME,
      maxLongEdge: MAX_LONG_EDGE,
      forceReencode: false,
    })
  })
  it('honours an explicit image/jpeg request (the MetaTab og:image case)', () => {
    const resolved = resolveCompressOptions({ outputMime: 'image/jpeg' })
    expect(resolved.outputMime).toBe('image/jpeg')
  })
  it('treats any non-jpeg outputMime as "use the default" (fails safe)', () => {
    // @ts-expect-error deliberately passing an unsupported value to prove the fail-safe branch
    expect(resolveCompressOptions({ outputMime: 'image/avif' }).outputMime).toBe(OUTPUT_MIME)
  })
  it('honours a positive custom maxLongEdge', () => {
    expect(resolveCompressOptions({ maxLongEdge: OG_IMAGE_MAX_LONG_EDGE }).maxLongEdge).toBe(
      OG_IMAGE_MAX_LONG_EDGE,
    )
  })
  it('falls back to MAX_LONG_EDGE for a zero or negative maxLongEdge (fails safe against a bad caller)', () => {
    expect(resolveCompressOptions({ maxLongEdge: 0 }).maxLongEdge).toBe(MAX_LONG_EDGE)
    expect(resolveCompressOptions({ maxLongEdge: -100 }).maxLongEdge).toBe(MAX_LONG_EDGE)
  })
  it('coerces forceReencode strictly to a boolean (only literal true turns it on)', () => {
    expect(resolveCompressOptions({ forceReencode: true }).forceReencode).toBe(true)
    expect(resolveCompressOptions({ forceReencode: false }).forceReencode).toBe(false)
  })
  it('resolves the full og:image-shaped option set together', () => {
    expect(
      resolveCompressOptions({
        outputMime: 'image/jpeg',
        maxLongEdge: OG_IMAGE_MAX_LONG_EDGE,
        forceReencode: true,
      }),
    ).toEqual({
      outputMime: 'image/jpeg',
      maxLongEdge: OG_IMAGE_MAX_LONG_EDGE,
      forceReencode: true,
    })
  })
})
