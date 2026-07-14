import 'server-only'
import { headers } from 'next/headers'

/**
 * Absolute base URL (no trailing slash) for building EXTERNAL redirect targets —
 * notably the Midtrans Snap finish URL handed to createSnapTransaction.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL when set (lets you pin a canonical domain).
 *   2. The live request host (x-forwarded-host / host) — a RUNTIME value, so it
 *      stays correct even when NEXT_PUBLIC_SITE_URL was missing at build time
 *      (NEXT_PUBLIC_* is inlined at build; an unset var becomes an empty string
 *      in the bundle). Without this fallback an empty base produced a *relative*
 *      success URL that Midtrans resolved against its own checkout domain → 404.
 *
 * Returns '' only if there is neither an env value nor a host header, which does
 * not happen inside a real request. Callers may still build a (relative) URL in
 * that impossible case rather than throwing and blocking checkout.
 *
 * Server-only: uses next/headers. Safe to call from server actions / RSC.
 */
export function siteBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (env) return env

  try {
    const h = headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  } catch {
    // headers() throws when called outside a request scope (e.g. unit tests).
    // Fall through to '' — real server-action/RSC calls always have a scope.
  }
  return ''
}
