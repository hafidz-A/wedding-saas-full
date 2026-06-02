import 'server-only'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Lightweight fixed-window rate limiter backed by Postgres (Supabase), so it
 * works across Vercel serverless instances (an in-memory counter would reset on
 * every cold start and be per-instance). Requires the `rl_hit` SQL function +
 * `rate_limits` table from the accompanying migration.
 *
 * Fails OPEN: if the limiter itself errors (DB blip), the request is allowed —
 * we never want the abuse-protection layer to take down a legitimate RSVP.
 */

/** Best-effort client IP. On Vercel, `x-forwarded-for` is set per request. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number
  /** Max requests allowed per key per window. */
  max: number
}

export async function rateLimit(
  key: string,
  { windowMs, max }: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs
  const retryAfterSec = Math.ceil((windowStartMs + windowMs - Date.now()) / 1000)
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await (admin as any).rpc('rl_hit', {
      p_bucket: key,
      p_window: new Date(windowStartMs).toISOString(),
      p_limit: max,
    })
    if (error) {
      console.error('[rateLimit] rl_hit error (failing open):', error)
      return { allowed: true, retryAfterSec }
    }
    return { allowed: data === true, retryAfterSec }
  } catch (e) {
    console.error('[rateLimit] unexpected (failing open):', e)
    return { allowed: true, retryAfterSec }
  }
}

/**
 * One-liner for API routes. Returns a 429 NextResponse when the caller is over
 * the limit, or `null` when the request may proceed:
 *
 *   const limited = await enforceRateLimit(req, 'rsvp', { windowMs: 60_000, max: 10 })
 *   if (limited) return limited
 */
export async function enforceRateLimit(
  req: Request,
  name: string,
  opts: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = getClientIp(req)
  const { allowed, retryAfterSec } = await rateLimit(`${name}:${ip}`, opts)
  if (allowed) return null
  return NextResponse.json(
    { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )
}
