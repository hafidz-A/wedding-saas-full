/* ============================================================
   staticAsset.js — where the site's own committed images are served from.

   Two hosts, one code path:

     • unset  → "/templates/lovebirds/demo/coupleGate.webp"
                Next serves the file straight out of public/. This is the
                default, and it is what every local dev run and every test
                sees, so nothing breaks when the env var is missing.

     • set    → "https://media.fincards.land/static/templates/…/coupleGate.webp"
                The same file, fetched from Cloudflare R2 instead.

   Why bother: Vercel bills Fast Data Transfer and Edge Requests on every byte
   and every hit out of public/, and the demo pages the ads link to are the
   heaviest public surface on the site. R2 bills storage, never egress — so
   moving these assets moves the traffic off the metered host entirely.

   The `static/` key prefix is reserved in scripts/lib/orphan-media.mjs; the
   media purge must never mistake these for a dead invitation's leftovers.

   Plain JS (not TS) on purpose: the template `demoImages.js` files that consume
   it are plain JS too, and they are pulled in by the server-safe
   src/config/templateIndex.js.
   ============================================================ */

/** Bucket-root folder holding the committed assets. Mirrors RESERVED_PREFIXES. */
export const STATIC_PREFIX = 'static'

/**
 * Absolute URL for a committed asset, or the local path when no CDN host is set.
 * `p` is the path as it exists under public/, with or without a leading slash.
 */
export function staticAsset(p) {
  const clean = p.startsWith('/') ? p : `/${p}`
  // Read as a full static expression so Next can inline it at build time.
  const host = (process.env.NEXT_PUBLIC_STATIC_ASSET_HOST || '').replace(/\/+$/, '')
  return host ? `${host}/${STATIC_PREFIX}${clean}` : clean
}
