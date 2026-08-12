// src/lib/admin/pdp.ts
// Server-only PDP (personal-data) routines: account-deletion (erase PII, keep an
// anonymized financial record for paid invitations) + a decrypted data export.
import 'server-only'
import { decryptField as decGuest } from '@/lib/guests/crypto'
import { decryptField as decApp } from '@/lib/crypto/app'
import { decryptConfig } from '@/lib/crypto/config'
import { deletePrefix } from '@/lib/upload/r2'

// PII child tables — deleted when anonymizing a paid invitation. plan_upgrades /
// quota_addons / refunds are financial and intentionally KEPT.
const PII_CHILD_TABLES = ['guests', 'rsvps', 'attendances', 'gift_confirmations', 'guestbook_notes', 'playlist_songs']

/**
 * Pure: the column patch that anonymizes a PAID invitation in place — strips every
 * personal identifier (email, owner, the name-bearing slug, all config content) and
 * takes it down, while keeping the financial columns (is_paid/paid_amount_idr/
 * paid_source/plan/template_id) untouched.
 */
export function anonymizedInvitationPatch(id: string, nowIso: string): Record<string, unknown> {
  return {
    is_published: false,
    owner_user_id: null,
    email: null,
    owner_email: null,
    slug: `deleted-${id.slice(0, 8)}`, // a chosen slug can contain the couple's names
    config: {},                        // wipe all personal content
    archived_at: nowIso,
    pii_erased_at: nowIso,
  }
}

/**
 * Erase an invitation's media.
 *
 * R2 is the only store: the Supabase bucket was emptied once every object had a
 * verified R2 twin, and nothing writes there any more. This used to sweep both.
 *
 * Swallows its own failure on purpose — a storage blip must not abort the rest
 * of the erasure, which still has PII rows to clear. The leftovers stay
 * findable afterwards via `scripts/purge-orphan-media.mjs`, and the error is
 * logged rather than lost.
 */
async function removeStorage(invitationId: string): Promise<void> {
  try {
    await deletePrefix(`${invitationId}/`)
  } catch (e) {
    console.error(`[pdp] R2 media cleanup failed for ${invitationId}:`, e)
  }
}

/**
 * Erase a user's personal data. Unpaid drafts are hard-deleted (row + children
 * cascade off invitation_id + storage); PAID invitations are anonymized in place
 * (PII child rows + storage removed, personal columns scrubbed, owner detached) so
 * the financial record survives without identity. Finally deletes the auth user.
 * Idempotent: only touches invitations still owned by userId — after the first run
 * paid rows have owner_user_id=null, so a reprocess is a no-op. Nulling the owner
 * BEFORE deleting the user is what stops the ON DELETE CASCADE from taking the
 * kept (paid) rows.
 */
export async function processAccountDeletion(db: any, userId: string): Promise<{ anonymized: number; deleted: number }> {
  const { data: invs } = await db.from('invitations').select('id, is_paid').eq('owner_user_id', userId)
  let anonymized = 0
  let deleted = 0
  const nowIso = new Date().toISOString()
  for (const inv of invs ?? []) {
    await removeStorage(inv.id) // storage never cascades — remove for both paths
    if (inv.is_paid) {
      for (const t of PII_CHILD_TABLES) await db.from(t).delete().eq('invitation_id', inv.id)
      await (db.from('invitations') as any).update(anonymizedInvitationPatch(inv.id, nowIso)).eq('id', inv.id)
      anonymized++
    } else {
      await db.from('invitations').delete().eq('id', inv.id) // children cascade off invitation_id
      deleted++
    }
  }
  try { await db.auth.admin.deleteUser(userId) } catch (e) { console.error('[pdp deleteUser]', e) }
  return { anonymized, deleted }
}

/**
 * Decrypted export of a single user's data (own-data-only). Mirrors
 * scripts/export-decrypted.mjs but scoped to this user's invitations. password_hash
 * (bcrypt, one-way) is never included.
 */
export async function buildUserExport(db: any, userId: string): Promise<Record<string, any>> {
  const { data: invs } = await db.from('invitations').select('*').eq('owner_user_id', userId)
  const invitations = invs ?? []
  const bundle: Record<string, any> = {
    exported_at: new Date().toISOString(), user_id: userId,
    invitations: invitations.map((r: any) => ({
      id: r.id, slug: r.slug, template_id: r.template_id, plan: r.plan,
      is_published: r.is_published, is_paid: r.is_paid, email: r.email,
      created_at: r.created_at, expires_at: r.expires_at, config: decryptConfig(r.config),
    })),
    guests: [], rsvps: [], attendances: [], gift_confirmations: [], guestbook_notes: [], playlist_songs: [],
  }
  const ids = invitations.map((i: any) => i.id)
  if (ids.length === 0) return bundle

  const q = (table: string) => db.from(table).select('*').in('invitation_id', ids)
  const [g, rs, at, gc, gn, ps] = await Promise.all([
    q('guests'), q('rsvps'), q('attendances'), q('gift_confirmations'), q('guestbook_notes'), q('playlist_songs'),
  ])
  bundle.guests = (g.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, group_label: r.group_label, name: decGuest(r.name_enc), phone: decGuest(r.phone_enc), notes: decGuest(r.notes_enc), created_at: r.created_at }))
  bundle.rsvps = (rs.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, attending: r.attending, guest_count: r.guest_count, guest_name: decApp(r.guest_name_enc), message: decApp(r.message_enc), created_at: r.created_at }))
  bundle.attendances = (at.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, name: decApp(r.name_enc), guest_count: r.guest_count, source: r.source, note: decApp(r.note_enc), arrived_at: r.arrived_at, created_at: r.created_at }))
  bundle.gift_confirmations = (gc.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, account_used: r.account_used, currency: r.currency, status: r.status, guest_name: decApp(r.guest_name_enc), amount: decApp(r.amount_enc), message: decApp(r.message_enc), created_at: r.created_at }))
  bundle.guestbook_notes = (gn.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, color: r.color, is_approved: r.is_approved, guest_name: r.guest_name_enc != null ? decApp(r.guest_name_enc) : r.guest_name, message: r.message_enc != null ? decApp(r.message_enc) : r.message, created_at: r.created_at }))
  bundle.playlist_songs = (ps.data ?? []).map((r: any) => ({ id: r.id, invitation_id: r.invitation_id, song: r.song, artist: r.artist, suggested_by: r.suggested_by_enc != null ? decApp(r.suggested_by_enc) : r.suggested_by, created_at: r.created_at }))
  return bundle
}
