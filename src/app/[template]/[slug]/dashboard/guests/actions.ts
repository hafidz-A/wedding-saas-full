'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseGuestImport } from '@/lib/guests/parse-import'
import { normalizePhone } from '@/lib/guests/phone'
import { encryptField } from '@/lib/guests/crypto'
import { fromDbRow, type GuestRow, type GuestRowDb } from './types'

/**
 * Verify the calling user owns the invitation for this slug, then return
 * the invitation_id. Mirrors the auth gate in page.tsx: the Supabase Auth
 * session's user.id must match invitations.owner_user_id for the slug.
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

export async function addGuest(
  slug: string,
  input: { name: string; phoneRaw?: string; groupLabel?: string },
): Promise<GuestRow> {
  const invitation_id = await authorizeOwnership(slug)
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  const phoneE164 = input.phoneRaw ? normalizePhone(input.phoneRaw) : null
  const admin = createSupabaseAdminClient()
  const { data, error } = (await admin
    .from('guests')
    .insert({
      invitation_id,
      name_enc: encryptField(name),
      phone_enc: encryptField(phoneE164),
      group_label: input.groupLabel?.trim() || null,
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
  await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name_enc = encryptField(patch.name.trim())
  if (patch.phoneRaw !== undefined) {
    const e164 = patch.phoneRaw === null ? null : normalizePhone(patch.phoneRaw)
    update.phone_enc = encryptField(e164)
  }
  if (patch.groupLabel !== undefined) update.group_label = patch.groupLabel?.trim() || null
  if (patch.notes !== undefined) update.notes_enc = encryptField(patch.notes?.trim() || null)
  const { error } = await (admin.from('guests') as any).update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function deleteGuest(slug: string, id: string): Promise<void> {
  await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('guests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function importGuests(
  slug: string,
  text: string,
): Promise<{ inserted: number }> {
  const invitation_id = await authorizeOwnership(slug)
  const rows = parseGuestImport(text)
  if (rows.length === 0) return { inserted: 0 }
  const admin = createSupabaseAdminClient()
  const { error, count } = await admin
    .from('guests')
    .insert(
      rows.map((r) => ({
        invitation_id,
        name_enc: encryptField(r.name),
        phone_enc: encryptField(r.phoneE164),
      })) as any,
      { count: 'exact' },
    )
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  return { inserted: count ?? rows.length }
}

export async function markGuestSent(slug: string, id: string): Promise<void> {
  await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const { error } = await (admin.from('guests') as any)
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
}

export async function unmarkGuestSent(slug: string, id: string): Promise<void> {
  await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const { error } = await (admin.from('guests') as any).update({ sent_at: null }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
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
    if (error) return { ok: false, error: error.message }

    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}
