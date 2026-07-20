/**
 * Invitation favicon — now the official FinCards brand icon on every page
 * without exception (owner decision 2026-07-20; replaces the per-couple
 * monogram wreath). Kept as a route (same URL) so existing tabs/caches
 * keep working; serves the pre-generated square brand PNG.
 */
import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

let cached: Uint8Array | null = null

export async function GET() {
  if (!cached) {
    cached = new Uint8Array(
      await readFile(path.join(process.cwd(), 'public', 'images', 'brand', 'fincards-icon-512.png')),
    )
  }
  return new NextResponse(cached as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=604800',
    },
  })
}
