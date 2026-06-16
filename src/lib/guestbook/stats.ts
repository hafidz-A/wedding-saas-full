export interface LedgerStatInput {
  arrived_at: string | null
  guest_count: number
  source: 'rsvp' | 'walkin' | 'unregistered'
}

export interface LedgerStats {
  totalEntries: number
  arrivedCount: number
  notArrivedCount: number
  /** Σ guest_count over rows that have checked in. */
  attendeesArrived: number
  walkinCount: number
}

export function computeStats(rows: LedgerStatInput[]): LedgerStats {
  let arrivedCount = 0
  let attendeesArrived = 0
  let walkinCount = 0
  for (const r of rows) {
    if (r.arrived_at) {
      arrivedCount++
      attendeesArrived += r.guest_count || 0
    }
    // Everyone who arrived without filling the RSVP (invited walk-in OR
    // unregistered) counts toward the "walk-in" stat.
    if (r.source !== 'rsvp') walkinCount++
  }
  return {
    totalEntries: rows.length,
    arrivedCount,
    notArrivedCount: rows.length - arrivedCount,
    attendeesArrived,
    walkinCount,
  }
}
