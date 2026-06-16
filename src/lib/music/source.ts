/**
 * Music source helpers — shared by the dashboard Music tab, the PUT /music API,
 * and the public players (solary + lovebirds). A couple can set background music
 * from four sources; this module normalises them to something playable.
 */

export type MusicSourceKind = 'upload' | 'url' | 'youtube' | 'library'

export interface MusicConfig {
  source?: MusicSourceKind
  /** Playable audio URL for upload / url / library sources. */
  url?: string
  /** Parsed YouTube video id for the youtube source. */
  youtubeId?: string
  [k: string]: unknown
}

const YT_ID = /^[a-zA-Z0-9_-]{11}$/

/**
 * Extract a YouTube video id from a watch / youtu.be / embed / shorts URL, or
 * accept a bare 11-char id. Returns null for anything else (incl. non-YouTube
 * URLs), so callers can validate before saving.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim()
  if (YT_ID.test(s)) return s

  let url: URL
  try {
    url = new URL(s)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return YT_ID.test(id) ? id : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v')
      return v && YT_ID.test(v) ? v : null
    }
    const m = url.pathname.match(/^\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/)
    if (m) return m[1]
  }
  return null
}

export type ResolvedMusic =
  | { kind: 'youtube'; youtubeId: string }
  | { kind: 'audio'; url: string }
  | null

/**
 * Resolve a stored music config to a single playable source. Tolerant of legacy
 * configs that only have `url` (treated as audio) and youtube configs that lack
 * the explicit `source` flag.
 */
export function resolveMusicSource(music: MusicConfig | null | undefined): ResolvedMusic {
  if (!music) return null
  if (music.source === 'youtube' && music.youtubeId) {
    return { kind: 'youtube', youtubeId: music.youtubeId }
  }
  if (music.url) return { kind: 'audio', url: music.url }
  if (music.youtubeId) return { kind: 'youtube', youtubeId: music.youtubeId }
  return null
}
