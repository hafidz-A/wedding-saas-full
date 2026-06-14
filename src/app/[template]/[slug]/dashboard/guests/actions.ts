'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyOwnership } from '@/editor/lib/auth'
import { parseGuestImport } from '@/lib/guests/parse-import'
import { normalizePhone } from '@/lib/guests/phone'
import { encryptField } from '@/lib/guests/crypto'
import { generateToken, hashToken, encryptToken } from '@/lib/guests/token'
import { fromDbRow, type GuestRow, type GuestRowDb } from './types'

/**
 * Verify the calling user owns the invitation for this slug, then return
 * the invitation_id. Single source of truth: editor/lib/auth.verifyOwnership
 * (the Supabase Auth session's user.id must match invitations.owner_user_id).
 */
async function authorizeOwnership(slug: string): Promise<string> {
  const owner = await verifyOwnership(slug)
  if (!owner) throw new Error('Forbidden — not the owner of this invitation')
  return owner.id
}

export async function addGuest(
  slug: string,
  input: { name: string; phoneRaw?: string; groupLabel?: string },
): Promise<GuestRow> {
  const invitation_id = await authorizeOwnership(slug)
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  const phoneE164 = input.phoneRaw ? normalizePhone(input.phoneRaw) : null
  const admin = createSupabaseAdminClient()
  const token = generateToken()
  const { data, error } = (await admin
    .from('guests')
    .insert({
      invitation_id,
      name_enc: encryptField(name),
      phone_enc: encryptField(phoneE164),
      group_label: input.groupLabel?.trim() || null,
      rsvp_token_enc: encryptToken(token),
      rsvp_token_hash: hashToken(invitation_id, token),
    } as any)
    .select()
    .single()) as { data: GuestRowDb | null; error: { message: string } | null }
  if (error || !data) throw new Error(error?.message || 'Insert failed')
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  return fromDbRow(data)
}

export async function updateGuest(
  slug: string,
  id: string,
  patch: {
    name?: string
    phoneRaw?: string | null
    groupLabel?: string | null
    notes?: string | null
  },
): Promise<void> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name_enc = encryptField(patch.name.trim())
  if (patch.phoneRaw !== undefined) {
    const e164 = patch.phoneRaw === null ? null : normalizePhone(patch.phoneRaw)
    update.phone_enc = encryptField(e164)
  }
  if (patch.groupLabel !== undefined) update.group_label = patch.groupLabel?.trim() || null
  if (patch.notes !== undefined) update.notes_enc = encryptField(patch.notes?.trim() || null)
  // Scope by invitation_id so an owner can never touch another couple's guest (IDOR).
  const { error } = await (admin.from('guests') as any)
    .update(update)
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function deleteGuest(slug: string, id: string): Promise<void> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  // Scope by invitation_id so an owner can never delete another couple's guest (IDOR).
  const { error } = await admin
    .from('guests')
    .delete()
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function importGuests(
  slug: string,
  text: string,
): Promise<{ inserted: number }> {
  const invitation_id = await authorizeOwnership(slug)
  // DoS guards: bound the raw paste size and the number of rows per import.
  if (text.length > 1_000_000) {
    throw new Error('Data impor terlalu besar. Bagi menjadi beberapa bagian.')
  }
  const rows = parseGuestImport(text)
  if (rows.length === 0) return { inserted: 0 }
  if (rows.length > 5000) {
    throw new Error('Maksimal 5000 tamu per impor. Bagi daftar menjadi beberapa bagian.')
  }
  const admin = createSupabaseAdminClient()
  // Existing hashes for this invitation → guarantee the batch never collides
  // with codes already issued (the unique index would otherwise reject the
  // whole insert).
  const { data: existing } = (await admin
    .from('guests')
    .select('rsvp_token_hash')
    .eq('invitation_id', invitation_id)
    .limit(10_000)) as { data: { rsvp_token_hash: string | null }[] | null }
  const usedHashes = new Set((existing || []).map((r) => r.rsvp_token_hash).filter(Boolean) as string[])

  const insertRows = rows.map((r) => {
    let token = generateToken()
    let h = hashToken(invitation_id, token)
    while (usedHashes.has(h)) {
      token = generateToken()
      h = hashToken(invitation_id, token)
    }
    usedHashes.add(h)
    return {
      invitation_id,
      name_enc: encryptField(r.name),
      phone_enc: encryptField(r.phoneE164),
      rsvp_token_enc: encryptToken(token),
      rsvp_token_hash: h,
    }
  })

  const { error, count } = await admin
    .from('guests')
    .insert(insertRows as any, { count: 'exact' })
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  return { inserted: count ?? rows.length }
}

export async function markGuestSent(slug: string, id: string): Promise<void> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const { error } = await (admin.from('guests') as any)
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function unmarkGuestSent(slug: string, id: string): Promise<void> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const { error } = await (admin.from('guests') as any)
    .update({ sent_at: null })
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

/**
 * Regenerate a guest's single-use RSVP token (owner error-recovery). Writes a
 * fresh enc + hash, clears token_used_at so the new code works, and stamps
 * token_regenerated_at. Scoped by invitation_id so an owner can never touch
 * another couple's guest (IDOR). Returns the new plaintext code for display.
 */
export async function regenerateGuestToken(
  slug: string,
  id: string,
): Promise<{ token: string }> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const token = generateToken()
  const { error, count } = await (admin.from('guests') as any)
    .update(
      {
        rsvp_token_enc: encryptToken(token),
        rsvp_token_hash: hashToken(invitation_id, token),
        token_used_at: null,
        token_regenerated_at: new Date().toISOString(),
      },
      { count: 'exact' },
    )
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  if (!count) throw new Error('Guest not found')
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  return { token }
}

/**
 * Update the couple's global WhatsApp invite message template.
 * Stored under invitation.config.inviteMessageTemplate. The template
 * supports {{name}} and {{url}} placeholders.
 */
export async function updateInviteMessageTemplate(
  slug: string,
  template: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, owner_user_id, config')
      .eq('slug', slug)
      .maybeSingle()) as {
      data: { id: string; owner_user_id: string; config: Record<string, any> } | null
    }
    if (!inv) return { ok: false, error: 'Invitation not found' }
    if (inv.owner_user_id !== user.id) return { ok: false, error: 'Forbidden' }

    const nextConfig = { ...inv.config, inviteMessageTemplate: template }
    const { error } = await (admin.from('invitations') as any)
      .update({ config: nextConfig })
      .eq('id', inv.id)
    if (error) {
      console.error('[updateInviteMessageTemplate]', error)
      return { ok: false, error: 'Gagal menyimpan template pesan. Coba lagi sebentar lagi.' }
    }

    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true }
  } catch (e) {
    console.error('[updateInviteMessageTemplate]', e)
    return { ok: false, error: 'Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.' }
  }
}
