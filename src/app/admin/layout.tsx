import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin, AdminAuthError } from '@/lib/admin/is-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminAuthError && e.reason === 'mfa-required') {
      redirect('/login?mfa=1&next=%2Fadmin')
    }
    redirect('/') // not an admin — hide the console
  }
  const nav = [
    ['/admin', 'Ringkasan'],
    ['/admin/templates', 'Template & Harga'],
    ['/admin/invitations', 'Undangan'],
    ['/admin/payments', 'Pembayaran'],
    ['/admin/users', 'Akun & Data'],
  ] as const
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
      <nav style={{ borderRight: '0.5px solid var(--border-default)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ marginBottom: 8 }}>Admin</strong>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} style={{ fontSize: 14 }}>{label}</Link>
        ))}
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
