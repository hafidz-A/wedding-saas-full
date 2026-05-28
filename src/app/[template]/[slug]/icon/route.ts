/**
 * Per-couple favicon — returns an SVG with a floral wreath surrounding
 * the couple's monogram. Reads the monogram from invitations.config →
 * sections[type=hero].props.monogram. Falls back to first letters of
 * brideName + groomName when monogram is empty, then to "A & B".
 *
 * Why a plain SVG Response (and not next/og ImageResponse):
 *   - No @vercel/og runtime dependency (smaller, more reliable on deploy)
 *   - Browsers scale SVG to any tab-icon size with no quality loss
 *   - Easier to debug — just open the URL and "View Source" the XML
 */
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Always render on demand so monogram edits show up immediately
// (subject to the s-maxage edge cache below).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteContext {
  params: { template: string; slug: string }
}

const WREATH_COLORS = ['#E8553E', '#C89A1F', '#2D8C4E', '#3D9BC1', '#6B35A8']

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<'
      ? '&lt;'
      : c === '>'
      ? '&gt;'
      : c === '&'
      ? '&amp;'
      : c === "'"
      ? '&apos;'
      : '&quot;',
  )
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = params
  let monogram = 'A & B'

  try {
    const supabase = createSupabaseAdminClient()
    const { data } = (await supabase
      .from('invitations')
      .select('config')
      .eq('slug', slug)
      .maybeSingle()) as { data: { config: any } | null }

    if (data?.config) {
      const hero = (data.config.sections || []).find((s: any) => s.type === 'hero')
      const props = (hero?.props || {}) as Record<string, any>
      const explicit = typeof props.monogram === 'string' ? props.monogram.trim() : ''
      if (explicit) {
        monogram = explicit
      } else if (props.brideName && props.groomName) {
        const b = String(props.brideName).trim()[0] || '?'
        const g = String(props.groomName).trim()[0] || '?'
        monogram = `${b.toUpperCase()} & ${g.toUpperCase()}`
      }
    }
  } catch (e) {
    console.error('[favicon] supabase read failed for slug', slug, e)
  }

  // Build SVG: 12 dots arranged around the circle edge + an italic
  // serif monogram in the center.
  const dots: string[] = []
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
    const r = 26
    const cx = (32 + Math.cos(angle) * r).toFixed(2)
    const cy = (32 + Math.sin(angle) * r).toFixed(2)
    const size = i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 5
    const color = WREATH_COLORS[i % WREATH_COLORS.length]
    dots.push(
      `<circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="${color}" opacity="0.78"/>`,
    )
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="32" fill="#F5EFE3"/>
  ${dots.join('\n  ')}
  <text x="32" y="38" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="600" font-size="13" fill="#2A2118">${escapeXml(monogram)}</text>
</svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Browser: revalidate every load so monogram edits are visible after
      //   one hard-refresh. Edge: cache 60s to absorb traffic spikes.
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
