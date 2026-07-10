// src/app/admin/users/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { processAccountDeletion, buildUserExport } from '@/lib/admin/pdp'
import { sendAdminEmail } from '@/lib/email/send'

type Result = { ok: boolean; error?: string }

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/**
 * Process a deletion request: erase the user's PII (anonymize paid invitations,
 * hard-delete drafts, delete the auth user). Only on/after the 7-day grace.
 * Idempotent — a request already processed is a no-op.
 */
export async function adminProcessDeletion(requestId: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: req } = (await db.from('account_deletion_requests')
    .select('id, user_id, status, scheduled_for, email').eq('id', requestId).maybeSingle()) as { data: any | null }
  if (!req) return { ok: false, error: 'Permintaan tidak ditemukan' }
  if (req.status === 'processed') return { ok: true }
  if (req.status !== 'pending') return { ok: false, error: 'Permintaan sudah diproses / dibatalkan' }
  if (req.scheduled_for && Date.parse(req.scheduled_for) > Date.now()) {
    return { ok: false, error: `Masih dalam tenggang 7 hari — baru bisa diproses ${new Date(req.scheduled_for).toLocaleDateString('id-ID')}` }
  }
  if (!req.user_id) return { ok: false, error: 'Permintaan tanpa user_id' }

  const result = await processAccountDeletion(db, req.user_id)
  await (db.from('account_deletion_requests') as any)
    .update({ status: 'processed', processed_by: admin.email, processed_at: new Date().toISOString() })
    .eq('id', requestId)
  // Confirm to the (now-deleted) couple's stored email — best-effort.
  if (req.email) await sendAdminEmail({
    to: req.email,
    subject: 'Akun & data kamu telah dihapus',
    html: `<p>Halo,</p><p>Sesuai permintaanmu, akun &amp; data pribadimu sudah <strong>dihapus</strong> dari FinCards. Undangan yang sudah dibayar kami simpan sebagai catatan keuangan tanpa identitas (kewajiban pembukuan). Terima kasih telah memakai FinCards.</p>`,
  })
  await logAdminAction(admin.email, { action: 'account.delete', targetType: 'user', targetId: req.user_id, meta: { email: req.email, anonymized: result.anonymized, deleted: result.deleted } })
  revalidateInvitation()
  return { ok: true }
}

/** Reject a deletion request with a note (no data touched). */
export async function adminRejectDeletion(requestId: string, note?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: req } = (await db.from('account_deletion_requests').select('id, status, user_id, email').eq('id', requestId).maybeSingle()) as { data: any | null }
  if (!req) return { ok: false, error: 'Permintaan tidak ditemukan' }
  if (req.status !== 'pending') return { ok: false, error: 'Permintaan sudah diproses / dibatalkan' }
  await (db.from('account_deletion_requests') as any)
    .update({ status: 'rejected', processed_by: admin.email, processed_at: new Date().toISOString(), note: note ?? null })
    .eq('id', requestId)
  // Notify the couple (best-effort — no-op until Resend is configured).
  if (req.email) await sendAdminEmail({
    to: req.email,
    subject: 'Permintaan hapus akun ditolak',
    html: `<p>Halo,</p><p>Setelah kami tinjau, permintaan penghapusan akunmu <strong>belum bisa kami proses</strong>${note ? `: ${escapeHtml(note)}` : '.'} Akunmu tetap aktif seperti biasa. Kalau ada pertanyaan, silakan balas email ini.</p>`,
  })
  await logAdminAction(admin.email, { action: 'account.deletion_reject', targetType: 'user', targetId: req.user_id ?? '', meta: { note: note ?? null } })
  return { ok: true }
}

/** Operator export of a user's decrypted data (audited). */
export async function adminExportUserData(userId: string): Promise<{ ok: boolean; error?: string; json?: string }> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  if (!userId) return { ok: false, error: 'userId kosong' }
  const db = createSupabaseAdminClient()
  const bundle = await buildUserExport(db, userId)
  await logAdminAction(admin.email, { action: 'data.export_admin', targetType: 'user', targetId: userId })
  return { ok: true, json: JSON.stringify(bundle, null, 2) }
}
