/**
 * Shared upload constants + file-signature ("magic byte") validators.
 *
 * ONE source of truth for the media rules, imported by:
 *   • the legacy server-proxy route        (src/app/api/upload/route.ts)
 *   • the signed-URL authorize step         (src/app/api/upload/sign/route.ts)
 *   • the post-upload verify step           (src/app/api/upload/verify/route.ts)
 *   • the browser upload helper (constants)  (src/editor/lib/uploadFile.ts)
 *
 * Pure module — NO server-only imports — so the client helper can reuse the
 * mime/size allowlists for an instant pre-check. The authoritative check always
 * runs on the server.
 */

export const BUCKET = 'invitation-media'

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
export const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4',
])
export const ALLOWED_MIMES = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_AUDIO_MIMES])

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024 // 12 MB
// Hard per-invitation storage ceiling. Galleries cap at 30 photos (~5 MB each)
// + audio; 300 MB leaves generous headroom while stopping a runaway upload
// loop from ballooning the Storage bill.
export const MAX_TOTAL_BYTES = 300 * 1024 * 1024 // 300 MB

/** Per-file byte ceiling for a declared mime (audio gets the larger budget). */
export function maxBytesFor(mime: string): number {
  return ALLOWED_AUDIO_MIMES.has(mime) ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
}

/**
 * Storage object path for an invitation's upload:
 *   <invitation_id>/<timestamp>-<safe-name>
 * The invitation id prefix is the ownership boundary the verify route enforces.
 */
export function safeStoragePath(invitationId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  return `${invitationId}/${Date.now()}-${safeName}`
}

/** Verify a buffer's leading bytes match the declared image MIME type. */
export function imageSignatureMatches(mime: string, b: Uint8Array): boolean {
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

/**
 * True if the buffer starts with one of the common audio container signatures.
 * Lenient by design (matches the format family, not the exact declared MIME)
 * because browsers report m4a/aac content-types inconsistently — the goal is to
 * block non-audio binaries, not to police the exact codec.
 */
export function audioSignatureMatches(b: Uint8Array): boolean {
  if (b.length < 12) return false
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) if (b[offset + i] !== s.charCodeAt(i)) return false
    return true
  }
  if (ascii(0, 'ID3')) return true                         // MP3 with ID3v2 tag
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return true  // MPEG / ADTS frame sync (mp3, aac)
  if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return true     // WAV
  if (ascii(0, 'OggS')) return true                         // OGG / Opus
  if (ascii(4, 'ftyp')) return true                         // M4A / MP4 audio (ISO-BMFF)
  if (ascii(0, 'ADIF')) return true                         // AAC ADIF
  return false
}

/**
 * Sniff which allowed media family a buffer's real bytes belong to, ignoring any
 * client-declared content-type. Returns null when the bytes look like neither a
 * supported image nor audio container — the signal the verify route uses to
 * reject + delete a mislabeled / polyglot upload.
 */
export function sniffMediaKind(b: Uint8Array): 'image' | 'audio' | null {
  if (audioSignatureMatches(b)) return 'audio'
  for (const mime of ALLOWED_IMAGE_MIMES) {
    if (imageSignatureMatches(mime, b)) return 'image'
  }
  return null
}
