import 'server-only'
import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string compare for secrets (callback tokens, check-in tokens).
 * Avoids leaking how many leading characters matched via response-timing.
 * Returns false on length mismatch.
 */
export function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
