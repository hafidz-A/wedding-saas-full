/* ============================================================
   musi/utils/invite.js — small browser/date helpers.
   Template-local on purpose (templates never import each other).
   ============================================================ */

/** ?to= guest name from a personal invite link (display-only, escaped by React). */
export function readGuestName() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = new URLSearchParams(window.location.search).get('to')
    if (!raw) return ''
    return raw.replace(/[<>{}]/g, '').trim().slice(0, 80)
  } catch {
    return ''
  }
}

/** The dashboard preview iframe loads the page with ?preview=1. */
export function readPreviewMode() {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('preview') === '1'
  } catch {
    return false
  }
}

/** `?theme=` carries the palette chosen in the landing explorer into the demo. */
export function readThemeParam() {
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get('theme') || ''
  } catch {
    return ''
  }
}

export const TIMEZONES = {
  WIB: { offset: '+07:00', iana: 'Asia/Jakarta' },
  WITA: { offset: '+08:00', iana: 'Asia/Makassar' },
  WIT: { offset: '+09:00', iana: 'Asia/Jayapura' },
}

/** "YYYY-MM-DDTHH:mm" (zone-less, as the editor stores it) + WIB/WITA/WIT → Date. */
export function parseEventDate(value, tz = 'WIB') {
  if (!value || typeof value !== 'string') return null
  const base = value.length === 16 ? `${value}:00` : value.slice(0, 19)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(base)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(`${base}${(TIMEZONES[tz] || TIMEZONES.WIB).offset}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Day name, long date and "14 · 02 · 2027", read in the event's own time zone. */
export function formatEventDate(date, tz = 'WIB') {
  if (!date) return { day: '', long: '', dots: '' }
  const timeZone = (TIMEZONES[tz] || TIMEZONES.WIB).iana
  const part = (opts) => new Intl.DateTimeFormat('id-ID', { timeZone, ...opts }).format(date)
  return {
    day: part({ weekday: 'long' }),
    long: part({ day: 'numeric', month: 'long', year: 'numeric' }),
    dots: `${part({ day: '2-digit' })} · ${part({ month: '2-digit' })} · ${part({ year: 'numeric' })}`,
  }
}

const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/** Google Calendar "add event" link (opens in a new tab; works for every viewer). */
export function calendarLink({ title, start, hours = 5, location, details }) {
  if (!start) return ''
  const end = new Date(start.getTime() + hours * 3600_000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Undangan Pernikahan',
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
  })
  if (location) q.set('location', location)
  if (details) q.set('details', details)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/** Only http(s) links are rendered as anchors (couple-entered URLs). */
export function safeUrl(url) {
  const s = String(url || '').trim()
  return /^https?:\/\//i.test(s) ? s : ''
}

/** "Nadia & Arya" → "N & A" — fills a portrait frame that has no photo yet. */
export function initials(a, b) {
  const one = (s) => (String(s || '').trim()[0] || '').toUpperCase()
  return [one(a), one(b)].filter(Boolean).join(' & ')
}
