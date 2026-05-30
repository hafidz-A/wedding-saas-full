/**
 * App-shape attendance row — what the client (GuestbookTab) sees. The name
 * is plaintext here. Phase 2 stores plaintext in name_enc / note_enc; Phase 3
 * switches fromDbRow() below to decryptField() once writes are encrypted.
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
  created_at: string
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
    name: row.name_enc ?? '',
    guest_count: row.guest_count,
    source: row.source,
    note: row.note_enc,
    arrived_at: row.arrived_at,
    created_at: row.created_at,
  }
}
