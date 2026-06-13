/**
 * Sanitize an owner-supplied URL before using it as a link target. Invitation
 * config is editable by the couple, so a malicious/compromised owner could store
 * a `javascript:` (or `data:text/html`, `vbscript:`) URL that would run in a
 * guest's browser when clicked — stored XSS. This blanks anything that isn't an
 * obviously-safe scheme.
 *
 * Allowed: http(s), mailto:, tel:, wa.me / api.whatsapp links, and relative
 * targets (`#anchor`, `/path`). Everything else → '#' (a harmless no-op href).
 *
 * Usable from both server and 'use client' template files (no node deps).
 */
export function safeExternalUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '#'
  const v = raw.trim()
  if (!v) return '#'
  // Relative / same-page targets are safe.
  if (v.startsWith('#') || v.startsWith('/')) return v
  // Strip whitespace + control chars (U+0000–U+0020) that could obscure the
  // scheme (e.g. "java\tscript:" or a leading newline) before testing.
  const cleaned = Array.from(v).filter((c) => c.charCodeAt(0) > 32).join('')
  const lower = cleaned.toLowerCase()
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return cleaned
  }
  // A scheme-less value like "wa.me/62..." or "instagram.com/x" — treat as https.
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(cleaned)) return `https://${cleaned}`
  return '#'
}
