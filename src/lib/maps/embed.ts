/**
 * Turn whatever a couple pastes into the "URL embed peta" box into a Google
 * Maps URL that can actually render inside an <iframe>.
 *
 * Couples paste the link from Maps' "Bagikan" button (maps.app.goo.gl/…) or
 * the browser bar (google.com/maps/place/…). Google refuses to be framed on
 * both, so the map card rendered as an empty grey box. Only /maps/embed URLs
 * and the keyless `maps?q=…&output=embed` form are frameable.
 *
 * Accepted input:
 *   • <iframe src="…"> HTML from Maps' "Sematkan peta" (src extracted)
 *   • google.com/maps/embed?pb=…          → kept as-is
 *   • google.com/maps/place/NAME/@…/data=…!3dLAT!4dLNG → pin coords
 *   • google.com/maps/search/QUERY, ?q= / ?query=, bare @LAT,LNG
 *   • maps.app.goo.gl / goo.gl/maps short links → resolved server-side
 *     (resolveMapEmbed) by following their redirect, then parsed as above.
 *
 * Anything else (non-Google hosts included) yields '' so the section hides the
 * map instead of framing an arbitrary page or showing a dead box.
 */

const EMBED_BASE = 'https://maps.google.com/maps'

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl'])

function isGoogleHost(host: string): boolean {
  // google.com, www.google.com, maps.google.com, google.co.id, www.google.co.id …
  return /^(?:(?:www|maps)\.)?google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host)
}

function qEmbed(q: string): string {
  return `${EMBED_BASE}?q=${encodeURIComponent(q)}&z=16&output=embed`
}

function parseUrl(raw: string): URL | null {
  let s = raw.trim()
  if (!s) return null
  // Pasted the whole <iframe …> snippet from "Sematkan peta".
  const iframe = s.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i)
  if (iframe) s = iframe[1].replace(/&amp;/g, '&')
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null
  } catch {
    return null
  }
}

/** A short link that needs its redirect followed before it can be parsed. */
export function isMapShortLink(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const u = parseUrl(raw)
  if (!u) return false
  const host = u.hostname.toLowerCase()
  if (host === 'maps.app.goo.gl') return true
  return host === 'goo.gl' && u.pathname.startsWith('/maps')
}

/**
 * Synchronous normaliser. Returns a frameable embed URL, or '' when the input
 * is empty, unparseable, not Google Maps, or a short link (see resolveMapEmbed).
 */
export function normalizeMapEmbed(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const u = parseUrl(raw)
  if (!u) return ''
  const host = u.hostname.toLowerCase()
  if (SHORT_LINK_HOSTS.has(host) || !isGoogleHost(host)) return ''

  let path = u.pathname
  try { path = decodeURIComponent(path) } catch { /* malformed %-escape: parse raw */ }

  // Already an embed URL — normalise the host onto one the CSP frame-src allows.
  if (path.startsWith('/maps/embed')) {
    return `https://www.google.com${u.pathname}${u.search}`
  }
  if (u.searchParams.get('output') === 'embed') {
    return `${EMBED_BASE}${u.search}`
  }

  // Exact pin of a place link: …/data=…!3d-6.19!4d106.82…
  const pin = path.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin) return qEmbed(`${pin[1]},${pin[2]}`)

  const q = u.searchParams.get('q') || u.searchParams.get('query')
  if (q) return qEmbed(q)

  const named = path.match(/^\/maps\/(?:place|search)\/([^/@]+)/)
  if (named) return qEmbed(named[1].replace(/\+/g, ' '))

  // Viewport centre: /maps/@-6.19,106.82,17z
  const at = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) return qEmbed(`${at[1]},${at[2]}`)

  return ''
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/**
 * Server-side: like normalizeMapEmbed, but follows maps.app.goo.gl / goo.gl
 * redirects (manually, up to 4 hops, Google hosts only) so the couple can
 * paste the plain "Bagikan" link. Never throws — any failure yields ''.
 */
export async function resolveMapEmbed(raw: unknown, fetchImpl: FetchLike = fetch): Promise<string> {
  if (!isMapShortLink(raw)) return normalizeMapEmbed(raw)
  let current = parseUrl(raw as string)!.toString()
  for (let hop = 0; hop < 4; hop++) {
    let res: Response
    try {
      res = await fetchImpl(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
        // Short links never change target; cache the lookup for a day.
        next: { revalidate: 86400 },
      } as RequestInit)
    } catch {
      return ''
    }
    const loc = res.headers.get('location')
    if (!loc) return ''
    const next = new URL(loc, current)
    const host = next.hostname.toLowerCase()
    if (!SHORT_LINK_HOSTS.has(host) && !isGoogleHost(host)) return ''
    const src = normalizeMapEmbed(next.toString())
    if (src) return src
    current = next.toString()
  }
  return ''
}

/**
 * The "Open in Google Maps" link for a map. Prefers what the couple pasted
 * when it's a normal Maps link (a maps.app.goo.gl share link opens the Maps
 * app straight on phones); otherwise derives a search link from the embed
 * src. '' when nothing usable.
 */
export function mapOpenUrl(raw: unknown, embedSrc: string): string {
  if (!embedSrc) return ''
  if (typeof raw === 'string') {
    const u = parseUrl(raw)
    const isIframe = /<iframe/i.test(raw)
    if (u && !isIframe) {
      const host = u.hostname.toLowerCase()
      const isEmbed = u.pathname.startsWith('/maps/embed') || u.searchParams.get('output') === 'embed'
      if (!isEmbed && (isMapShortLink(raw) || isGoogleHost(host))) return u.toString().replace(/^http:/, 'https:')
    }
  }
  let e: URL
  try { e = new URL(embedSrc) } catch { return '' }
  const search = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  const q = e.searchParams.get('q')
  if (q) return search(q)
  // /maps/embed?pb=…!2d<lng>!3d<lat>…
  const pb = e.searchParams.get('pb') || ''
  const lng = pb.match(/!2d(-?\d+(?:\.\d+)?)/)
  const lat = pb.match(/!3d(-?\d+(?:\.\d+)?)/)
  if (lat && lng) return search(`${lat[1]},${lng[1]}`)
  return ''
}

/** Render-time pass over a config: rewrite every section's `mapEmbed` into a
 *  frameable src, and add `mapLink` (see mapOpenUrl). */
export async function resolveConfigMapEmbeds<T>(config: T, fetchImpl?: FetchLike): Promise<T> {
  const c = config as { sections?: Array<{ props?: Record<string, unknown> }> }
  if (!c || !Array.isArray(c.sections)) return config
  if (!c.sections.some((s) => s?.props && typeof s.props.mapEmbed === 'string' && s.props.mapEmbed)) return config
  const sections = await Promise.all(
    c.sections.map(async (s) => {
      if (!s?.props || typeof s.props.mapEmbed !== 'string' || !s.props.mapEmbed) return s
      const raw = s.props.mapEmbed
      const mapEmbed = await resolveMapEmbed(raw, fetchImpl)
      return { ...s, props: { ...s.props, mapEmbed, mapLink: mapOpenUrl(raw, mapEmbed) } }
    }),
  )
  return { ...(config as object), sections } as T
}
