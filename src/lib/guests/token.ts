import { createHmac, randomInt } from 'node:crypto'
import { loadKey, encryptField, decryptField } from './crypto'

/** A fresh random 6-digit code, zero-padded (e.g. "042913"). Never sequential. */
export function generateToken(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * HMAC-SHA256 of `invitationId:token`, keyed by the guests-domain key. This is
 * the indexed lookup/compare value stored in guests.rsvp_token_hash — no raw
 * token is ever queryable. Binds the token to one invitation so the same 6
 * digits in two couples' lists hash differently.
 */
export function hashToken(invitationId: string, token: string): string {
  const masterKey = loadKey(process.env.GUESTS_ENCRYPTION_KEY, 'GUESTS_ENCRYPTION_KEY')
  // Domain-separate the HMAC key from the AES-GCM usage of the same master key:
  // derive a dedicated 32-byte sub-key so rotating one usage never silently
  // changes the other. The label is versioned so a future scheme can coexist.
  const hmacKey = createHmac('sha256', masterKey).update('rsvp-token-hmac-v1').digest()
  return createHmac('sha256', hmacKey).update(`${invitationId}:${token}`).digest('hex')
}

/** Reversible ciphertext of the code, so the owner can read/copy + WA-blast it. */
export function encryptToken(token: string): string {
  return encryptField(token) as string
}

export function decryptToken(enc: string | null | undefined): string | null {
  return decryptField(enc)
}

/**
 * `count` distinct 6-digit codes. Used by bulk import so a single batch never
 * collides with itself. Throws if asked for more than the space allows.
 */
export function generateUniqueTokens(count: number): string[] {
  // Cap below 100% fill: at 900k the expected draw count is ~2.3M (~0.2s) and
  // tail risk stays bounded. Do not raise this limit.
  if (count > 900_000) throw new Error('Terlalu banyak kode unik diminta')
  const set = new Set<string>()
  while (set.size < count) set.add(generateToken())
  return [...set]
}
