// src/app/profile/actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/log'
import { buildUserExport } from '@/lib/admin/pdp'
import { rateLimit } from '@/lib/security/rate-limit'

type Result = { ok: boolean; error?: string }

/** 7-day grace window before an account-deletion request can be processed. */
const DELETION_GRACE_MS = 7 * 86_400_000

/** Download THIS user's decrypted data (own data only). Audited. */
export async function exportMyData(): Promise<{ ok: boolean; error?: string; json?: string }> {
  const server = createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false, error: 'Tidak ada sesi login' }
  const { allowed } = await rateLimit(`export:${user.id}`, { windowMs: 60_000, max: 3 })
  if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }
  const db = createSupabaseAdminClient()
  const bundle = await buildUserExport(db, user.id)
  await logAdminAction(user.email ?? user.id, { action: 'data.export_self', targetType: 'user', targetId: user.id })
  return { ok: true, json: JSON.stringify(bundle, null, 2) }
}

/** File a deletion request (operator processes on/after the 7-day grace). */
export async function requestAccountDeletion(reason?: string): Promise<Result> {
  const server = createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false, error: 'Tidak ada sesi login' }
  const { allowed } = await rateLimit(`deletereq:${user.id}`, { windowMs: 60_000, max: 3 })
  if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan.' }
  const db = createSupabaseAdminClient()
  const { data: pending } = await (db.from('account_deletion_requests') as any)
    .select('id').eq('user_id', user.id).eq('status', 'pending').limit(1)
  if (pending && pending.length) return { ok: false, error: 'Kamu sudah punya permintaan hapus akun yang sedang berjalan.' }
  const { error } = await (db.from('account_deletion_requests') as any).insert({
    user_id: user.id, email: user.email, reason: reason ?? null, status: 'pending',
    scheduled_for: new Date(Date.now() + DELETION_GRACE_MS).toISOString(),
  })
  if (error) return { ok: false, error: 'Gagal mengajukan. Mungkin sudah ada permintaan berjalan.' }
  return { ok: true }
}

/** Cancel this user's pending deletion request (within the grace window). */
export async function cancelAccountDeletion(): Promise<Result> {
  const server = createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false, error: 'Tidak ada sesi login' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('account_deletion_requests') as any)
    .update({ status: 'cancelled' }).eq('user_id', user.id).eq('status', 'pending')
  if (error) return { ok: false, error: 'Gagal membatalkan.' }
  return { ok: true }
}
