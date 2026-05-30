'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { decryptField } from '@/lib/guests/crypto'
import { encryptField } from '@/lib/crypto/app'
import { fromDbRow, type AttendanceRow, type AttendanceRowDb } from './types'

/**
 * Verify the calling user owns the invitation for this slug, then return the
 * invitation_id. Mirrors authorizeOwnership() in ../guests/actions.ts.
 */
async function authorizeOwnership(slug: string): Promise<string> {
  const serverClient = createSupabaseServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createSupabaseAdminClient()
  const { data: invitation, error } = (await admin
    .from('invitations')
    .select('id, owner_user_id')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; owner_user_id: string } | null; error: unknown }
  if (error || !invitation) throw new Error('Invitation not found')
  if (invitation.owner_user_id !== user.id) {
    throw new Error('Forbidden — not the owner of this invitation')
  }
  return invitation.id
}

export interface WalkInGuestHit {
  id: string
  name: string
  group_label: string | null
  phone_masked: string | null
}

/** Mask a phone down to its last 4 digits for the result list. */
function maskPhone(e164: string | null): string | null {
  if (!e164) return null
  const digits = e164.replace(/\D/g, '')
  if (digits.length <= 4) return '••••'
  return '•••• ' + digits.slice(-4)
}

/**
 * Typeahead search for the walk-in dialog. Decrypts the invitation's guests
 * server-side and case-insensitively substring-matches the name. Returns at
 * most 10 hits. Never returns ciphertext to the client.
 */
export async function searchWalkInGuests(
  slug: string,
  query: string,
): Promise<WalkInGuestHit[]> {
  const invitation_id = await authorizeOwnership(slug)
  const q = query.trim().toLowerCase()
  if (!q) return []

  const admin = createSupabaseAdminClient()
  const { data, error } = (await admin
    .from('guests')
    .select('id, name_enc, phone_enc, group_label')
    .eq('invitation_id', invitation_id)) as {
    data:
      | { id: string; name_enc: string; phone_enc: string | null; group_label: string | null }[]
      | null
    error: { message: string } | null
  }
  if (error || !data) return []

  const hits: WalkInGuestHit[] = []
  for (const g of data) {
    const name = decryptField(g.name_enc) ?? ''
    if (name.toLowerCase().includes(q)) {
      hits.push({
        id: g.id,
        name,
        group_label: g.group_label,
        phone_masked: maskPhone(decryptField(g.phone_enc)),
      })
      if (hits.length >= 10) break
    }
  }
  return hits
}

/**
 * Flat result shape (not a discriminated union): server-action return types
 * don't reliably narrow on the client side of the 'use server' boundary, so
 * every field is optional and the caller reads them defensively.
 */
export interface AddWalkInResult {
  ok: boolean
  row?: AttendanceRow
  code?: 'duplicate' | 'not_found' | 'error'
  error?: string
}

/**
 * Add a walk-in attendance, matched to an existing guests row. Verifies the
 * guest belongs to the invitation, then inserts source='walkin'. The unique
 * index on (invitation_id, guest_id) protects against double-add → 'duplicate'.
 */
export async function addWalkInAttendance(input: {
  slug: string
  guestId: string
  count: number
  note?: string | null
}): Promise<AddWalkInResult> {
  try {
    const invitation_id = await authorizeOwnership(input.slug)
    const admin = createSupabaseAdminClient()

    // Security: the guest must belong to THIS invitation.
    const { data: guest } = (await admin
      .from('guests')
      .select('id, name_enc, invitation_id')
      .eq('id', input.guestId)
      .maybeSingle()) as {
      data: { id: string; name_enc: string; invitation_id: string } | null
    }
    if (!guest || guest.invitation_id !== invitation_id) {
      return { ok: false, code: 'not_found', error: 'Guest not found for this invitation' }
    }

    const name = decryptField(guest.name_enc) ?? ''
    const count = Math.min(20, Math.max(1, Number(input.count) || 1))
    const note = input.note?.trim() || null

    const { data, error } = (await admin
      .from('attendances')
      .insert({
        invitation_id,
        guest_id: guest.id,
        rsvp_id: null,
        // `name` is decrypted from guests (GUESTS_ENCRYPTION_KEY) above, then
        // re-encrypted here under the app key for the attendances domain.
        name_enc: encryptField(name),
        guest_count: count,
        source: 'walkin',
        note_enc: encryptField(note),
        arrived_at: new Date().toISOString(),
      } as any)
      .select()
      .single()) as {
      data: AttendanceRowDb | null
      error: { message: string; code?: string } | null
    }

    if (error || !data) {
      if (error?.code === '23505') {
        return { ok: false, code: 'duplicate', error: 'Guest already in the ledger' }
      }
      return { ok: false, code: 'error', error: error?.message || 'Insert failed' }
    }

    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, row: fromDbRow(data) }
  } catch (e) {
    return { ok: false, code: 'error', error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

/** Remove an attendance row (correcting a mistaken entry). */
export async function deleteAttendance(
  slug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const invitation_id = await authorizeOwnership(slug)
    const admin = createSupabaseAdminClient()
    const { error } = await admin
      .from('attendances')
      .delete()
      .eq('id', id)
      .eq('invitation_id', invitation_id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}
