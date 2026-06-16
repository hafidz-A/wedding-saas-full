export type AttendanceCategory = 'rsvp' | 'walkin' | 'unlisted'

/**
 * Single source of truth for ledger row classification — used by both the
 * badge (LedgerTable) and the source filter (GuestbookTab) so they never drift.
 * An unlisted walk-in is one added at the venue with no guest-list match.
 */
export function attendanceCategory(
  row: { source: 'rsvp' | 'walkin' | 'unregistered'; guest_id: string | null },
): AttendanceCategory {
  if (row.source === 'unregistered') return 'unlisted'
  if (row.source === 'rsvp') return 'rsvp'
  // Legacy rows: a walk-in with no guest-list match was the old 'unlisted'.
  return row.guest_id ? 'walkin' : 'unlisted'
}
