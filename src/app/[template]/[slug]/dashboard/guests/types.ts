import { decryptField } from '@/lib/guests/crypto'

/** App-shape row — what the client sees. Always plaintext. */
export interface GuestRow {
  id: string
  invitation_id: string
  name: string
  phone_e164: string | null
  group_label: string | null
  notes: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

/** Raw DB row — encrypted columns are base64 strings. */
export interface GuestRowDb {
  id: string
  invitation_id: string
  name_enc: string
  phone_enc: string | null
  group_label: string | null
  notes_enc: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Decrypt a DB row into the app-shape GuestRow.
 * Lives in types.ts (not actions.ts) because Next.js 'use server' files may
 * only export async functions — this sync helper would crash the build.
 */
export function fromDbRow(row: GuestRowDb): GuestRow {
  return {
    id: row.id,
    invitation_id: row.invitation_id,
    name: decryptField(row.name_enc) ?? '',
    phone_e164: decryptField(row.phone_enc),
    group_label: row.group_label,
    notes: decryptField(row.notes_enc),
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
