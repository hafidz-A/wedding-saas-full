import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * App-level AES-256-GCM field encryption.
 *
 * Why GCM:
 *   - Authenticated: the 16-byte authTag detects tampering. If anyone
 *     modifies a row in Postgres directly, decrypt throws instead of
 *     returning corrupted-but-plausible text.
 *   - Per-row IV: each call generates a fresh 12-byte IV, so identical
 *     plaintexts produce different ciphertexts (no frequency analysis
 *     attack across the DB).
 *
 * On-disk format: base64(IV ‖ ciphertext ‖ authTag).
 *   - IV is 12 bytes (GCM standard), authTag 16 bytes, ciphertext variable.
 *
 * The default helpers (encryptField / decryptField) read
 * process.env.GUESTS_ENCRYPTION_KEY (the guests-table domain key). Other
 * domains pass their own key via encryptWithKey / decryptWithKey — see
 * src/lib/crypto/app.ts which wires the APP_ENCRYPTION_KEY domain on top of
 * the same primitives.
 */

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

/**
 * Decode a base64-encoded 32-byte key. Throws with a message naming the env
 * var so a missing/short key is obvious in logs. Shared by every domain key.
 */
export function loadKey(b64: string | undefined, envName: string): Buffer {
  if (!b64) {
    throw new Error(
      `${envName} env var is required. ` +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    )
  }
  const key = Buffer.from(b64, 'base64')
  if (key.length !== KEY_LEN) {
    throw new Error(`${envName} must decode to ${KEY_LEN} bytes (got ${key.length})`)
  }
  return key
}

/** Encrypt a string field with an explicit key. Returns null for null input. */
export function encryptWithKey(key: Buffer, plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ct, tag]).toString('base64')
}

/** Decrypt a payload produced by encryptWithKey. Throws on tampering. */
export function decryptWithKey(key: Buffer, payload: string | null | undefined): string | null {
  if (payload === null || payload === undefined) return null
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Encrypted payload is too short to be valid')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

/** The guests-table domain key (read fresh each call so tests can swap env). */
function getKey(): Buffer {
  return loadKey(process.env.GUESTS_ENCRYPTION_KEY, 'GUESTS_ENCRYPTION_KEY')
}

/** Encrypt a guests-domain field. Returns null for null input. */
export function encryptField(plaintext: string | null | undefined): string | null {
  return encryptWithKey(getKey(), plaintext)
}

/** Decrypt a guests-domain payload produced by encryptField. Throws on tampering. */
export function decryptField(payload: string | null | undefined): string | null {
  return decryptWithKey(getKey(), payload)
}
