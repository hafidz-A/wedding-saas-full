/**
 * Leaked-password check via the Have I Been Pwned "Pwned Passwords" range API.
 *
 * This is the free, self-hosted equivalent of Supabase's Pro-only "leaked
 * password protection". It uses k-anonymity: we SHA-1 the password and send
 * only the first 5 hex chars of the hash to the API, then match the rest
 * locally — so the password (and even its full hash) never leaves the browser.
 *
 * Returns how many times the password has appeared in known breaches
 * (0 = not found / safe). FAILS OPEN (returns 0) on any network/API error, so a
 * HIBP outage can never block a legitimate signup — the local password policy
 * (passwordPolicy.ts) and the server-side Supabase requirements still apply.
 *
 * Runs in the browser (Web Crypto `crypto.subtle`), which the auth pages always
 * provide (https / localhost are secure contexts).
 */

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'

/** Uppercase hex SHA-1 of a string, via Web Crypto. */
async function sha1HexUpper(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Number of breaches the password appears in (0 = safe / unknown). Never throws.
 */
export async function pwnedPasswordCount(password: string): Promise<number> {
  if (!password) return 0
  try {
    const hash = await sha1HexUpper(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      // Add-Padding makes HIBP pad the response with bogus (count-0) entries so
      // a network observer can't infer the real count from the response size.
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return 0 // fail open

    const body = await res.text()
    for (const line of body.split('\n')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const hashSuffix = line.slice(0, idx).trim()
      if (hashSuffix === suffix) {
        const count = parseInt(line.slice(idx + 1).trim(), 10)
        return Number.isFinite(count) ? count : 0
      }
    }
    return 0
  } catch {
    return 0 // fail open — never block signup on a HIBP hiccup
  }
}

/** Convenience boolean wrapper around {@link pwnedPasswordCount}. */
export async function isPasswordPwned(password: string): Promise<boolean> {
  return (await pwnedPasswordCount(password)) > 0
}
