/**
 * Validates a `next` redirect target from a URL query string.
 *
 * Returns the value when it's safe to push/redirect to — meaning a
 * same-origin path like `/onboarding?template=solary` — or null when it
 * is missing, malformed, or smells like an open-redirect attempt:
 *   - external URLs (`https://evil.com`)
 *   - protocol-relative URLs (`//evil.com`)
 *   - backslashes (Windows quirk + IE protocol-relative bypass)
 *   - ASCII control characters: the WHATWG URL parser (browsers, and the Next
 *     router that resolves `next`) silently DELETES tab/CR/LF, so `/\t/evil.com`
 *     passes a `//` prefix check here and then navigates to //evil.com
 *   - absurdly long strings (likely abuse)
 *
 * Final guard: resolve the value exactly as the router will and require it to
 * stay on the same origin, so a parser quirk we didn't list can't slip through.
 */
const PROBE_ORIGIN = 'https://same-origin.invalid'

export function safeNext(next: string | null | undefined): string | null {
  if (!next || typeof next !== 'string') return null
  if (next.length > 500) return null
  if (/[\u0000-\u001F\u007F]/.test(next)) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//')) return null
  if (next.includes('\\')) return null
  if (next.includes('://')) return null
  try {
    if (new URL(next, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return null
  } catch {
    return null
  }
  return next
}
