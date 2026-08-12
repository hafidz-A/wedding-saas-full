/**
 * Which media objects a stored config actually points at.
 *
 * Used by the orphan purge as the compensating control for something R2 cannot
 * do: cap object size at the bucket. `/api/upload/verify` enforces the ceiling
 * on the real stored bytes, but the client calls it — an uploader who skips
 * that step leaves the object behind. Such an object is never referenced by any
 * config, which is exactly what makes it findable here.
 *
 * Matches BOTH hosts on purpose: configs written before the migration still
 * carry Supabase URLs, and both forms name the same key.
 *
 * PURE by design: `publicHost` is a parameter, never read from process.env
 * here — this file must stay a pure, testable helper. It is the same
 * convention as `rewriteMediaHost(url, host)` in `src/lib/config/mediaHost.ts`.
 * The caller (`purge-orphan-media.mjs`) passes the same `R2_PUBLIC_HOST` the
 * rest of the pipeline uses, so a run against a different environment (a
 * staging bucket, a renamed domain) matches that environment's real R2 host
 * instead of silently matching nothing on a delete path.
 */
const SUPABASE_MEDIA_URL =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media\/(.+)$/

/** Escape regex metacharacters so a literal host is safe to drop into a pattern. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build the R2-host matcher from a caller-supplied public host. Returns null
 * when no usable host is given — callers must never fall back to a hardcoded
 * domain, which would produce a confident-looking wrong answer on a delete path.
 */
function buildR2MediaUrl(publicHost) {
  if (!publicHost) return null
  const host = publicHost.replace(/\/+$/, '').replace(/^https:\/\//, '')
  if (!host) return null
  return new RegExp(`^https:\\/\\/${escapeRegExp(host)}\\/(.+)$`)
}

export function referencedMediaKeys(config, publicHost) {
  const keys = new Set()
  const r2MediaUrl = buildR2MediaUrl(publicHost)

  const walk = (value) => {
    if (typeof value === 'string') {
      const key = SUPABASE_MEDIA_URL.exec(value)?.[1] ?? r2MediaUrl?.exec(value)?.[1]
      if (key) keys.add(key.split('?')[0])
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(walk)
    }
  }

  walk(config)
  return keys
}
