// src/app/admin/invitations/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { resolvePlan } from '@/lib/payments/plans'
import { BLOCK_SIZE, QUOTA_CAP } from '@/lib/payments/quota'
import { compExpiry, type CompPeriod } from './period'

type Result = { ok: boolean; error?: string }

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

/** Mark an invitation paid without Xendit (offline/manual money, or a free comp). */
export async function adminComp(id: string, opts: { source: 'manual' | 'comp'; amountIDR: number; period: CompPeriod }): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, plan, template_id, suspended_at').eq('id', id).maybeSingle()) as { data: { plan: string; template_id: string; suspended_at: string | null } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const nowMs = Date.now()
  const expires = compExpiry(resolved ? resolved.expiresAt(nowMs) : null, opts.period, nowMs)
  // A suspended (taken-down) invitation must NOT auto-publish when comped.
  const { error } = await (db.from('invitations') as any).update({
    is_paid: true, is_published: !inv.suspended_at, paid_at: new Date(nowMs).toISOString(),
    expires_at: expires, paid_source: opts.source, paid_amount_idr: opts.source === 'comp' ? 0 : Math.max(0, Math.round(opts.amountIDR)),
  }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.comp', targetType: 'invitation', targetId: id, meta: { source: opts.source } })
  revalidateInvitation()
  return { ok: true }
}

export async function adminSetPublished(id: string, published: boolean): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  // Suspend beats publish: a taken-down invitation can't be re-published (by
  // admin OR owner) until it's un-suspended first.
  if (published) {
    const { data: inv } = (await db.from('invitations').select('suspended_at').eq('id', id).maybeSingle()) as { data: { suspended_at: string | null } | null }
    if (inv?.suspended_at) return { ok: false, error: 'Undangan sedang diblokir (suspend). Buka blokir dulu sebelum menerbitkan.' }
  }
  const { error } = await (db.from('invitations') as any).update({ is_published: published }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: published ? 'invitation.publish' : 'invitation.unpublish', targetType: 'invitation', targetId: id })
  revalidateInvitation()
  return { ok: true }
}

export async function adminChangePlan(id: string, plan: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  if (!plan.trim()) return { ok: false, error: 'Plan wajib' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('invitations') as any).update({ plan }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.change_plan', targetType: 'invitation', targetId: id, meta: { plan } })
  revalidateInvitation()
  return { ok: true }
}

/** Grant extra guest quota for free (multiple of 50, within cap). */
export async function adminAddQuota(id: string, qtyGuests: number): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const qty = Math.round(qtyGuests)
  if (qty <= 0 || qty % BLOCK_SIZE !== 0 || qty > QUOTA_CAP) return { ok: false, error: `Kelipatan ${BLOCK_SIZE}, maksimal ${QUOTA_CAP}` }
  const db = createSupabaseAdminClient()
  await (db as any).rpc('increment_guest_quota_extra', { p_invitation_id: id, p_qty: qty })
  await logAdminAction(admin.email, { action: 'invitation.add_quota', targetType: 'invitation', targetId: id, meta: { qty } })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Suspend (hard takedown) or lift it. Suspending sets `suspended_at` AND forces
 * `is_published = false`; the public page + the owner's own re-publish path both
 * honour `suspended_at`, so — unlike a soft unpublish the couple could undo —
 * this stays down until an admin lifts it.
 */
export async function adminSuspend(id: string, on: boolean, reason?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const patch = on
    ? { suspended_at: new Date().toISOString(), is_published: false }
    : { suspended_at: null }
  const { error } = await (db.from('invitations') as any).update(patch).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, {
    action: on ? 'invitation.suspend' : 'invitation.unsuspend',
    targetType: 'invitation', targetId: id,
    meta: on && reason ? { reason } : undefined,
  })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Archive / unarchive a PAID invitation. A paid invitation can't be hard-deleted
 * (its payment history has to survive for bookkeeping), so "delete" on a paid one
 * sets `archived_at` — hidden from the default admin list, row + records kept.
 */
export async function adminArchiveInvitation(id: string, on: boolean): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('invitations') as any)
    .update({ archived_at: on ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, {
    action: on ? 'invitation.archive' : 'invitation.unarchive',
    targetType: 'invitation', targetId: id,
  })
  revalidateInvitation()
  return { ok: true }
}

const MEDIA_BUCKET = 'invitation-media'

/**
 * Hard-delete an UNPAID draft. Irreversible, so the caller must pass the exact
 * slug to confirm. Removes `invitation-media/<id>/` files FIRST (storage does
 * not cascade), then deletes the row (child rows cascade off invitation_id).
 * Never touches the auth user (they may own other invitations). A PAID
 * invitation is refused here — archive it instead.
 */
export async function adminDeleteInvitation(id: string, confirmSlug: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, slug, is_paid').eq('id', id).maybeSingle()) as { data: { id: string; slug: string; is_paid: boolean } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  if (inv.is_paid) return { ok: false, error: 'Undangan berbayar tidak bisa dihapus — arsipkan saja (riwayat pembayaran harus disimpan).' }
  if ((confirmSlug || '').trim() !== inv.slug) return { ok: false, error: 'Ketik slug persis untuk konfirmasi hapus.' }
  // Storage first — files under invitation-media/<id>/ don't cascade.
  const { data: files } = await db.storage.from(MEDIA_BUCKET).list(id, { limit: 1000 })
  if (files && files.length) {
    await db.storage.from(MEDIA_BUCKET).remove(files.map((f) => `${id}/${f.name}`))
  }
  const { error } = await (db.from('invitations') as any).delete().eq('id', id)
  if (error) return { ok: false, error: 'Gagal menghapus' }
  await logAdminAction(admin.email, { action: 'invitation.delete', targetType: 'invitation', targetId: id, meta: { slug: inv.slug } })
  revalidateInvitation()
  return { ok: true }
}
