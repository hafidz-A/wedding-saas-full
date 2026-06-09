export interface CheckinCandidate {
  kind: 'guest' | 'rsvp'
  id: string
  name: string
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Filter candidates by a normalized substring query (min 3 chars), dedupe by
 * normalized name (preferring an 'rsvp' candidate, which already has a ledger
 * row), and cap to `limit`. Pure — caller supplies already-decrypted names.
 */
export function matchCheckinNames(
  query: string,
  candidates: CheckinCandidate[],
  limit = 5,
): CheckinCandidate[] {
  const q = norm(query)
  if (q.length < 3) return []
  const seen = new Map<string, CheckinCandidate>()
  for (const cand of candidates) {
    const n = norm(cand.name)
    if (!n.includes(q)) continue
    const existing = seen.get(n)
    if (!existing) seen.set(n, cand)
    else if (existing.kind === 'guest' && cand.kind === 'rsvp') seen.set(n, cand)
  }
  return Array.from(seen.values()).slice(0, limit)
}
