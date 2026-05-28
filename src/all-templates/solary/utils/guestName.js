/* ============================================================
   guestName.js — parse ?to= safely from URL
   ============================================================ */

export function readGuestName() {
  if (typeof window === "undefined") return null;
  try {
    const raw = new URLSearchParams(window.location.search).get("to");
    if (!raw) return null;
    const clean = decodeURIComponent(raw).replace(/[<>{}]/g, "").trim().slice(0, 80);
    return clean || null;
  } catch {
    return null;
  }
}

export function readPreviewMode() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("preview") === "1";
  } catch {
    return false;
  }
}
