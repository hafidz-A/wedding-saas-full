/**
 * buildGuestLink — append a personalized `?to=<name>` to the invitation URL so
 * the opening gate can greet the guest by name ("Welcome, dear Ahmad").
 *
 * Display-only and harmless if edited — it carries no authority and is rendered
 * as escaped text on the card. Separate from the single-use RSVP token (which is
 * still typed manually). Returns the bare URL when the name is empty.
 */
export function buildGuestLink(publicUrl: string, name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return publicUrl
  const sep = publicUrl.includes('?') ? '&' : '?'
  return `${publicUrl}${sep}to=${encodeURIComponent(trimmed)}`
}
