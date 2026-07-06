// src/app/admin/activity/page.tsx
// Admin: Aktivitas — the admin_actions audit log in plain Indonesian.
// Gated by src/app/admin/layout.tsx (requireAdmin).
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { renderAdminAction } from '@/lib/admin/log'

function fmt(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default async function AdminActivityPage() {
  const db = createSupabaseAdminClient()
  const { data } = (await (db.from('admin_actions') as any)
    .select('id, admin_email, action, target_type, target_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(300)) as { data: any[] | null }
  const rows = data ?? []

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Aktivitas</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Riwayat semua tindakan admin (comp, blokir, hapus, buat undangan, ubah harga, dll). {rows.length} tercatat.
      </p>
      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 16 }}>Belum ada aktivitas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
              <div style={{ fontSize: 14 }}>{renderAdminAction(r)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {r.admin_email} · {fmt(r.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
