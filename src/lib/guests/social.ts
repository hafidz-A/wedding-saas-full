/**
 * Guest Instagram / Facebook handles → DM links.
 *
 * Neither platform can open a DM with the message pre-filled (WhatsApp's
 * wa.me?text= has no IG/FB equivalent). The dashboard copies the message and
 * opens the guest's DM thread so the couple only has to paste and send.
 *
 * Couples type handles every which way, so normalise:
 *   "@rani.adi", "rani.adi", "instagram.com/rani.adi/?igsh=…",
 *   "ig.me/m/rani.adi"                          → "rani.adi"
 *   "facebook.com/rani.adi", "fb.com/…", "m.me/…" → "rani.adi"
 *   "facebook.com/profile.php?id=1000123"        → "1000123"
 * Anything that isn't a valid handle → null (the UI shows an error).
 */

export type SocialPlatform = 'instagram' | 'facebook'

// Instagram: 1–30 of letters, digits, "." and "_".
const IG_RE = /^[A-Za-z0-9._]{1,30}$/
// Facebook: a username (letters, digits, ".") of 5–50, or a numeric profile id.
const FB_RE = /^(?:[A-Za-z0-9.]{5,50}|\d{5,20})$/

const IG_HOSTS = /^(?:www\.|m\.)?(?:instagram\.com|instagr\.am|ig\.me)$/i
const FB_HOSTS = /^(?:www\.|m\.|web\.|mbasic\.)?(?:facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)$/i

// Paths that are not a person's profile.
const IG_RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'])
const FB_RESERVED = new Set(['groups', 'pages', 'events', 'watch', 'share', 'story.php', 'photo.php', 'permalink.php', 'login', 'messages', 't'])

export function normalizeSocialHandle(raw: unknown, platform: SocialPlatform): string | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null

  const looksLikeUrl = /[/.]/.test(s) && /(instagram|instagr\.am|ig\.me|facebook|fb\.|m\.me|messenger)/i.test(s)
  if (looksLikeUrl) {
    let u: URL
    try {
      u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    } catch {
      return null
    }
    const hosts = platform === 'instagram' ? IG_HOSTS : FB_HOSTS
    if (!hosts.test(u.hostname)) return null
    if (platform === 'facebook' && /profile\.php$/i.test(u.pathname)) {
      s = u.searchParams.get('id') || ''
    } else {
      const parts = u.pathname.split('/').filter(Boolean)
      // ig.me/m/<user>, m.me/<user>, messenger.com/t/<user>
      if ((parts[0] === 'm' && /ig\.me$/i.test(u.hostname)) || (parts[0] === 't' && /messenger\.com$/i.test(u.hostname))) parts.shift()
      const first = parts[0] || ''
      const reserved = platform === 'instagram' ? IG_RESERVED : FB_RESERVED
      if (reserved.has(first.toLowerCase())) return null
      s = first
    }
  }

  s = s.replace(/^@/, '')
  try { s = decodeURIComponent(s) } catch { /* keep as typed */ }
  const ok = platform === 'instagram' ? IG_RE.test(s) : FB_RE.test(s)
  if (!ok) return null
  // Instagram handles are case-insensitive; keep Facebook's as typed.
  return platform === 'instagram' ? s.toLowerCase() : s
}

/** Link that opens a DM thread with this handle (app on phones, web on desktop). */
export function socialDmUrl(handle: string, platform: SocialPlatform): string {
  const h = encodeURIComponent(handle)
  return platform === 'instagram' ? `https://ig.me/m/${h}` : `https://m.me/${h}`
}
