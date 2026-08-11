/**
 * Shape test for a value stored in a `*_enc` column: base64 of at least
 * IV(12) + 1 byte of ciphertext + GCM tag(16).
 *
 * NECESSARY, NOT SUFFICIENT. Letters-only plaintext of the right length is
 * itself valid base64 and passes. Callers must also prove the value reverses
 * with the domain key — that decryption step is the real gate; this one only
 * catches obviously-plaintext values early and cheaply.
 */
export function looksEncrypted(value) {
  if (typeof value !== 'string' || value.length < 38) return false
  if (!/^[A-Za-z0-9+/]+=*$/.test(value)) return false
  return Buffer.from(value, 'base64').length >= 12 + 1 + 16
}
