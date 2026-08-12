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
 */
const MEDIA_URL =
  /^https:\/\/(?:media\.fincards\.land|[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media)\/(.+)$/

export function referencedMediaKeys(config) {
  const keys = new Set()

  const walk = (value) => {
    if (typeof value === 'string') {
      const key = MEDIA_URL.exec(value)?.[1]
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
