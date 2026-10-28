export interface CheckinCandidate {
  kind: 'guest' | 'rsvp'
  id: string
  name: string
  /** Short hint shown under the name (the guest's group label) — tells two same-name guests apart. */
  label?: string | null
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Filter candidates by a normalized substring query (min 3 chars) and cap to
 * `limit`. Pure — caller supplies already-decrypted names.
 *
 * Same-name candidates collapse ONLY when they can be one person: at most one
 * invited guest plus at most one RSVP under that name. That pair shows once,
 * as the 'rsvp' candidate (it already has a ledger row) carrying the guest's
 * label. Two invited guests who share a name are two people and both stay.
 */
export function matchCheckinNames(
  query: string,
  candidates: CheckinCandidate[],
  limit = 8,
): CheckinCandidate[] {
  const q = norm(query)
  if (q.length < 3) return []
  const groups = new Map<string, { guests: CheckinCandidate[]; rsvps: CheckinCandidate[] }>()
  for (const cand of candidates) {
    const n = norm(cand.name)
    if (!n.includes(q)) continue
    let g = groups.get(n)
    if (!g) groups.set(n, (g = { guests: [], rsvps: [] }))
    ;(cand.kind === 'rsvp' ? g.rsvps : g.guests).push(cand)
  }
  const out: CheckinCandidate[] = []
  for (const { guests, rsvps } of Array.from(groups.values())) {
    if (guests.length <= 1 && rsvps.length <= 1) {
      const pick = rsvps[0] ?? guests[0]
      out.push({ ...pick, label: guests[0]?.label ?? pick.label ?? null })
    } else {
      out.push(...guests, ...rsvps)
    }
  }
  return out.slice(0, limit)
}
