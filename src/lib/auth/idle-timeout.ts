export const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000 // 4 hours
export const ACTIVITY_COOKIE = 'last_activity'

/**
 * True when the last recorded activity is older than the idle window.
 * A lastActivityMs of 0 (no record yet) is treated as not-expired so a fresh
 * session is initialized rather than immediately logged out.
 */
export function isIdleExpired(
  lastActivityMs: number,
  nowMs: number,
  idleMs: number = IDLE_TIMEOUT_MS,
): boolean {
  return lastActivityMs > 0 && nowMs - lastActivityMs > idleMs
}
