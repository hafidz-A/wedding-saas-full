import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin, AdminAuthError } from '@/lib/admin/is-admin'
import { AdminDialogProvider } from '@/components/admin/AdminDialogProvider'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminAuthError && e.reason === 'mfa-required') {
      redirect('/login?mfa=1&next=%2Fadmin')
    }
    redirect('/') // not an admin — hide the console
  }

  // "Ada notif": count of refund requests waiting for a decision → badge on Pembayaran.
  const db = createSupabaseAdminClient()
  const { count: pendingRefunds } = (await (db.from('refund_requests') as any)
    .select('id', { count: 'exact', head: true }).eq('status', 'pending')) as { count: number | null }

  const nav = [
    ['/admin', 'Ringkasan'],
    ['/admin/templates', 'Template & Harga'],
    ['/admin/invitations', 'Undangan'],
    ['/admin/payments', 'Pembayaran'],
    ['/admin/users', 'Akun & Data'],
    ['/admin/activity', 'Aktivitas'],
  ] as const
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
      <nav style={{ borderRight: '0.5px solid var(--border-default)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ marginBottom: 8 }}>Admin</strong>
        {nav.map(([href, label]) => {
          const badge = href === '/admin/payments' ? (pendingRefunds ?? 0) : 0
          return (
            <Link key={href} href={href} style={{ fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>{label}</span>
              {badge > 0 && (
                <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--radius-pill)', background: 'var(--status-error)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
              )}
            </Link>
          )
        })}
      </nav>
      <main style={{ padding: 24 }}>
        <AdminDialogProvider>{children}</AdminDialogProvider>
      </main>
    </div>
  )
}
