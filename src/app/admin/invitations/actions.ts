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
  const { data: inv } = (await db.from('invitations').select('id, plan, template_id').eq('id', id).maybeSingle()) as { data: { plan: string; template_id: string } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const nowMs = Date.now()
  const expires = compExpiry(resolved ? resolved.expiresAt(nowMs) : null, opts.period, nowMs)
  const { error } = await (db.from('invitations') as any).update({
    is_paid: true, is_published: true, paid_at: new Date(nowMs).toISOString(),
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
