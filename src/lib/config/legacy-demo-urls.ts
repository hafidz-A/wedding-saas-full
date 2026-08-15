import { staticAsset } from '@/lib/assets/staticAsset.js'

/**
 * Repoints bundled demo photo URLs that a stored config froze in place.
 *
 * Onboarding bakes the RESOLVED path of each demo photo into the config JSON,
 * so unlike live code — which goes through `demoImages.js` + `staticAsset()` on
 * every render — a stored row keeps whatever was true the day it was seeded.
 * Two independent things go stale that way:
 *
 *   • the extension — the demo set was re-encoded .jpg → .webp on 2026-08-15
 *     and the originals deleted (this shipped first and 404'd 46 images on a
 *     live invitation);
 *   • the host — those files then moved to R2, and a config still naming
 *     `/templates/...` keeps pulling them from Vercel, which is the metered
 *     host this whole change exists to get off (21 images per guest view).
 *
 * Both are fixed here, in one pass, by re-deriving the URL from the CURRENT
 * `staticAsset()` — so this also follows a future host change, and rewrites
 * stored R2 URLs back to local paths if the host is ever unset. Applied at READ
 * time (render + editor load), never written back, matching how
 * `migrateLovebirdsConfig` and `fillEmptyImages` keep old configs renderable.
 *
 * Scope is deliberately narrow: only the bundled demo folder, which we own and
 * moved. A customer's uploaded file lives under an invitation-id prefix and is
 * never matched — a test pins that.
 */

/** The bundled demo folder, in every shape a stored config may name it:
 *  bare path, with the R2 `static/` prefix, and with or without a host. */
const DEMO_URL =
  /(?:https?:\/\/[^/\s"']+)?(?:\/static)?\/templates\/lovebirds\/demo\/([^"'\s?/]+?)\.(?:jpe?g|webp)\b/gi

/** Rewrites one string's demo URLs to the current host + extension. */
export function repointDemoUrls(value: string): string {
  return value.replace(DEMO_URL, (_match, name: string) =>
    staticAsset(`/templates/lovebirds/demo/${name}.webp`),
  )
}

/**
 * Deep-copies `config`, repointing every bundled demo photo URL. Returns the
 * input unchanged for null/undefined/primitives so callers can pipe it
 * unconditionally.
 */
export function upgradeLegacyDemoImageUrls<T>(config: T): T {
  if (config === null || config === undefined) return config
  if (typeof config === 'string') return repointDemoUrls(config) as unknown as T
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
