import { loadKey, encryptWithKey, decryptWithKey } from '@/lib/guests/crypto'

/**
 * App-domain AES-256-GCM field encryption (rsvps, gift_confirmations,
 * attendances, and selected invitations.config paths).
 *
 * Separate key from the guests table so the two domains can be rotated
 * independently. Reads process.env.APP_ENCRYPTION_KEY (32 raw bytes,
 * base64-encoded → 44 chars). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Reuses the primitives in src/lib/guests/crypto.ts — same on-disk format,
 * same tamper detection — only the key source differs.
 */

/** Read the app-domain key fresh each call (env never changes at runtime). */
function getAppKey(): Buffer {
  return loadKey(process.env.APP_ENCRYPTION_KEY, 'APP_ENCRYPTION_KEY')
}

/** Encrypt an app-domain field. Returns null for null/undefined input. */
export function encryptField(plaintext: string | null | undefined): string | null {
  return encryptWithKey(getAppKey(), plaintext)
}

/** Decrypt an app-domain payload produced by encryptField. Throws on tampering. */
export function decryptField(payload: string | null | undefined): string | null {
  return decryptWithKey(getAppKey(), payload)
}
