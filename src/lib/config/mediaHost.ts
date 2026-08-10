/**
 * Render-time media host rewriting.
 *
 * Media files moved to Cloudflare R2, but the URLs already stored in
 * `invitations.config` still point at Supabase Storage. Rather than rewriting
 * thousands of stored strings — a migration that would have to be reversed by
 * hand if anything went wrong — the swap happens on the way out, every render.
 *
 * That makes the rollback a single env var: stop passing a host and every URL
 * resolves to Supabase again, where the original objects are deliberately kept.
 *
 * PURE by design: the host is a parameter, never read from process.env here.
 * `R2_PUBLIC_HOST` is server-only (no NEXT_PUBLIC_ prefix), so reading it inside
 * a module the client bundle can reach would silently evaluate to undefined
 * instead of failing loudly.
 */

/** Supabase Storage public URL for OUR media bucket, capturing everything up to the key. */
const SUPABASE_MEDIA_PREFIX =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media\//

export function rewriteMediaHost(url: unknown, host?: string | null): unknown {
  if (typeof url !== 'string' || !host) return url
  const match = SUPABASE_MEDIA_PREFIX.exec(url)
  if (!match) return url
  const key = url.slice(match[0].length)
  if (!key) return url // bucket root, nothing to address
  return `${host.replace(/\/+$/, '')}/${key}`
}

/** Deep-copy `config`, rewriting every media URL string it contains. */
export function rewriteConfigMediaHosts<T>(config: T, host?: string | null): T {
  if (!host || config == null) return config

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return rewriteMediaHost(value, host)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = walk(v)
      return out
    }
    return value
  }

  return walk(config) as T
}
