/**
 * Rewrites bundled demo photo URLs that still name the retired `.jpg` files.
 *
 * The demo set under public/templates/lovebirds/demo/ was re-encoded to .webp
 * on 2026-08-15 and the .jpg originals were deleted. Live code resolves those
 * paths through `demoImages.js`, so it followed the rename automatically — but
 * a stored `config` does not: onboarding bakes the resolved path into the JSON
 * at seed time, so every invitation created before that date carries dead
 * `.jpg` URLs in the database. Shipping the rename without this produced 46
 * image 404s on a live invitation.
 *
 * Applied at READ time (render + editor load), never written back, matching how
 * `migrateLovebirdsConfig` and `fillEmptyImages` already keep old configs
 * renderable. That means it also covers rows nobody has re-saved, and rows
 * restored from an old backup.
 *
 * Scope is deliberately narrow: only the bundled demo folder, which we own and
 * renamed. A customer's uploaded `.jpg` is untouched — those live under an
 * invitation-id prefix and were never part of the re-encode.
 */

// `/templates/lovebirds/demo/<name>.jpg` — with or without a host in front, and
// with or without the `static/` prefix the R2 copy carries.
const LEGACY_DEMO_JPG = /(\/templates\/lovebirds\/demo\/[^"'\s?]+)\.jpe?g\b/gi

/** True when the string names a bundled demo photo with the retired extension. */
export function isLegacyDemoUrl(value: string): boolean {
  LEGACY_DEMO_JPG.lastIndex = 0
  return LEGACY_DEMO_JPG.test(value)
}

/**
 * Deep-copies `config`, rewriting every legacy demo `.jpg` URL to `.webp`.
 * Returns the input unchanged for null/undefined/primitives so callers can pipe
 * it unconditionally.
 */
export function upgradeLegacyDemoImageUrls<T>(config: T): T {
  if (config === null || config === undefined) return config
  if (typeof config === 'string') {
    return config.replace(LEGACY_DEMO_JPG, '$1.webp') as unknown as T
  }
  if (Array.isArray(config)) {
    return config.map((v) => upgradeLegacyDemoImageUrls(v)) as unknown as T
  }
  if (typeof config === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
      out[k] = upgradeLegacyDemoImageUrls(v)
    }
    return out as unknown as T
  }
  return config
}
