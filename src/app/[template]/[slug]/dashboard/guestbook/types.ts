import { decryptField } from '@/lib/crypto/app'

/**
 * App-shape attendance row — what the client (GuestbookTab) sees, always
 * plaintext. fromDbRow() decrypts the _enc columns server-side.
 */
export interface AttendanceRow {
  id: string
  invitation_id: string
  guest_id: string | null
  rsvp_id: string | null
  name: string
  guest_count: number
  source: 'rsvp' | 'walkin'
  note: string | null
  arrived_at: string | null
  souvenir_taken: boolean
  table_no: string | null
  created_at: string
}

/**
 * Decrypt an attendances _enc value. Tolerant of plaintext: Phase 2 wrote
 * plaintext into name_enc/note_enc before encryption shipped, and the backfill
 * re-encrypts those rows. If a value isn't valid ciphertext (a lingering
 * plaintext row in the Phase 2→3 window), fall back to the raw value instead
 * of throwing, so the Buku Tamu tab still renders. New rows are ciphertext.
 */
function decryptAttendance(value: string | null): string | null {
  if (value == null) return null
  try {
    return decryptField(value)
  } catch {
    return value
  }
}

/** Raw DB row. name_enc/note_enc are plaintext in Phase 2, ciphertext after Phase 3. */
export interface AttendanceRowDb {
  id: string
  invitation_id: string
  guest_id: string | null
  rsvp_id: string | null
  name_enc: string
  guest_count: number
  source: 'rsvp' | 'walkin'
  note_enc: string | null
  arrived_at: string | null
  souvenir_taken?: boolean | null
  table_no?: string | null
  created_at: string
}

/**
 * Decrypt a DB row into the app-shape AttendanceRow. Lives in types.ts (not
 * actions.ts) because Next.js 'use server' files may only export async funcs.
 * Phase 3: wrap name_enc / note_enc in decryptField().
 */
export function fromDbRow(row: AttendanceRowDb): AttendanceRow {
  return {
    id: row.id,
    invitation_id: row.invitation_id,
    guest_id: row.guest_id,
    rsvp_id: row.rsvp_id,
    name: decryptAttendance(row.name_enc) ?? '',
    guest_count: row.guest_count,
    source: row.source,
    note: decryptAttendance(row.note_enc),
    arrived_at: row.arrived_at,
    souvenir_taken: row.souvenir_taken ?? false,
    table_no: row.table_no ?? null,
    created_at: row.created_at,
  }
}
