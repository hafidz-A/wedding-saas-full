/**
 * Validates a `next` redirect target from a URL query string.
 *
 * Returns the value when it's safe to push/redirect to — meaning a
 * same-origin path like `/onboarding?template=solary` — or null when it
 * is missing, malformed, or smells like an open-redirect attempt:
 *   - external URLs (`https://evil.com`)
 *   - protocol-relative URLs (`//evil.com`)
 *   - backslashes (Windows quirk + IE protocol-relative bypass)
 *   - absurdly long strings (likely abuse)
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || typeof next !== 'string') return null
  if (next.length > 500) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//')) return null
  if (next.includes('\\')) return null
  if (next.includes('://')) return null
  return next
}
