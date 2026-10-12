/* ============================================================
   guestName.js — parse ?to= and preview flag safely from the URL.
   Template-local mirror of lovebirds/utils/guestName.js (templates are
   intentionally independent — no cross-template imports).
   ============================================================ */

export function readGuestName() {
  if (typeof window === 'undefined') return null
  try {
    // URLSearchParams already percent-decodes — decoding again would throw on a
    // literal "%" in a name.
    const raw = new URLSearchParams(window.location.search).get('to')
    if (!raw) return null
    const clean = raw.replace(/[<>{}]/g, '').trim().slice(0, 80)
    return clean || null
  } catch {
    return null
  }
}

export function readPreviewMode() {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('preview') === '1'
  } catch {
    return false
  }
}
