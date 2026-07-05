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

/** Plain Indonesian one-liner for the Aktivitas view. Later modules add cases. */
export function renderAdminAction(row: { action: string; target_id?: string | null }): string {
  const id = row.target_id ?? ''
  const map: Record<string, string> = {
    'refund.approve': `Menyetujui refund ${id}`,
    'refund.reject': `Menolak refund ${id}`,
    'invitation.comp': `Comp undangan ${id}`,
    'invitation.suspend': `Suspend undangan ${id}`,
    'plan.update': `Ubah harga/paket ${id}`,
    'account.delete': `Hapus akun ${id}`,
  }
  return (map[row.action] ?? `${row.action} ${id}`).trim()
}
