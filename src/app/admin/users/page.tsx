// src/app/admin/users/page.tsx
// Admin: Users & data (PDP). Gated by src/app/admin/layout.tsx (requireAdmin).
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import UserExportButton from './UserExportButton'
import DeletionRequestRow from './DeletionRequestRow'

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso }
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const db = createSupabaseAdminClient()
  const q = (searchParams.q || '').trim().toLowerCase()

  // Find a user by exact email (auth users aren't SQL-queryable; scan first page).
  let found: { id: string; email: string; created_at: string; invitations: any[] } | null = null
  if (q) {
    const { data } = await (db as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
    const u = (data?.users || []).find((x: any) => x.email?.toLowerCase() === q)
    if (u) {
      const { data: invs } = (await db.from('invitations')
        .select('id, slug, template_id, is_paid, is_published, pii_erased_at').eq('owner_user_id', u.id)) as { data: any[] | null }
      found = { id: u.id, email: u.email, created_at: u.created_at, invitations: invs ?? [] }
    }
  }

  const { data: reqs } = (await db.from('account_deletion_requests')
    .select('id, user_id, email, reason, requested_at, scheduled_for')
    .eq('status', 'pending').order('requested_at', { ascending: true })) as { data: any[] | null }
  const requests = reqs ?? []

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Akun &amp; Data</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, maxWidth: 620 }}>
        Cari akun klien untuk <strong>mengunduh datanya</strong> atau melihat undangannya, dan proses <strong>permintaan hapus akun</strong>. Halaman ini kosong sampai kamu mencari — itu normal.
      </p>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Cari akun</h2>
        <form>
          <input name="q" defaultValue={searchParams.q || ''} placeholder="Ketik email lengkap klien…"
            style={{ height: 36, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', width: 320 }} />
          <button type="submit" style={{ height: 36, padding: '0 14px', marginLeft: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer' }}>Cari</button>
        </form>
        {!q && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Masukkan email <strong>lengkap &amp; persis</strong> milik klien, lalu tekan Cari — akun + tombol unduh datanya akan muncul di sini.</p>}
        {q && !found && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 10 }}>Tidak ada akun dengan email itu.</p>}
        {found && (
          <div style={{ marginTop: 12, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{found.email}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>daftar {fmt(found.created_at)} · {found.invitations.length} undangan</div>
              </div>
              <UserExportButton userId={found.id} />
            </div>
            {found.invitations.length > 0 && (
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                {found.invitations.map((inv) => (
                  <li key={inv.id}>{inv.slug} <span style={{ color: 'var(--text-muted)' }}>· {inv.template_id} · {inv.is_paid ? 'berbayar' : 'draft'}{inv.pii_erased_at ? ' · PII terhapus' : ''}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 style={{ fontSize: 16 }}>Permintaan hapus akun ({requests.length})</h2>
        {requests.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Tidak ada permintaan menunggu.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {requests.map((r) => (
              <DeletionRequestRow key={r.id} req={{
                id: r.id, email: r.email ?? '(tanpa email)', reason: r.reason ?? '',
                requestedAt: fmt(r.requested_at), scheduledFor: r.scheduled_for,
                scheduledLabel: fmt(r.scheduled_for),
                due: !r.scheduled_for || Date.parse(r.scheduled_for) <= Date.now(),
              }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
