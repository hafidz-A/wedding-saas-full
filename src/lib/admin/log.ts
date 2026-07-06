import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AdminActionInput {
  action: string
  targetType?: string
  targetId?: string
  meta?: Record<string, unknown>
}

/** Append one row to the admin_actions audit log (service-role, append-only). */
export async function logAdminAction(adminEmail: string, a: AdminActionInput): Promise<void> {
  const admin = createSupabaseAdminClient()
  await (admin.from('admin_actions') as any).insert({
    admin_email: adminEmail,
    action: a.action,
    target_type: a.targetType ?? null,
    target_id: a.targetId ?? null,
    meta: a.meta ?? null,
  })
}

/** Plain Indonesian one-liner for the Aktivitas view. Prefers a human-friendly
 *  slug from `meta` when present, else the raw target id. */
export function renderAdminAction(row: { action: string; target_id?: string | null; meta?: Record<string, unknown> | null }): string {
  const meta = (row.meta ?? {}) as Record<string, any>
  const ref = (typeof meta.slug === 'string' && meta.slug) || row.target_id || ''
  const map: Record<string, string> = {
    'refund.approve': `Menyetujui refund ${ref}`,
    'refund.reject': `Menolak refund ${ref}`,
    'invitation.comp': `Comp/lunas undangan ${ref}${meta.source ? ` (${meta.source})` : ''}`,
    'invitation.publish': `Terbitkan undangan ${ref}`,
    'invitation.unpublish': `Sembunyikan undangan ${ref}`,
    'invitation.suspend': `Blokir (suspend) undangan ${ref}`,
    'invitation.unsuspend': `Buka blokir undangan ${ref}`,
    'invitation.change_plan': `Ganti plan undangan ${ref}${meta.plan ? ` → ${meta.plan}` : ''}`,
    'invitation.add_quota': `Tambah kuota undangan ${ref}${meta.qty ? ` (+${meta.qty})` : ''}`,
    'invitation.archive': `Arsipkan undangan ${ref}`,
    'invitation.unarchive': `Keluarkan undangan ${ref} dari arsip`,
    'invitation.delete': `Hapus undangan ${ref}`,
    'invitation.create_for_client': `Buat undangan ${ref} untuk klien${meta.createdUser ? ' (akun baru)' : ''}`,
    'plan.update': `Ubah harga/paket ${ref}`,
    'account.delete': `Hapus akun ${ref}`,
  }
  return (map[row.action] ?? `${row.action} ${ref}`).trim()
}
