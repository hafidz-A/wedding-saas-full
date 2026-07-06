// src/app/admin/invitations/page.tsx
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { activePeriodStatus } from '@/lib/payments/active-period'
import InvitationRow from './InvitationRow'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Belum bayar', lifetime: 'Seumur hidup', active: 'Aktif', expired: 'Kadaluarsa',
}

export default async function AdminInvitationsPage({ searchParams }: { searchParams: { q?: string; archived?: string } }) {
  const db = createSupabaseAdminClient()
  const q = (searchParams.q || '').trim().toLowerCase()
  const showArchived = searchParams.archived === '1'
  const { data } = (await (db.from('invitations') as any)
    .select('id, slug, template_id, plan, is_paid, is_published, expires_at, email, paid_source, guest_quota_extra, suspended_at, archived_at, created_at')
    .order('created_at', { ascending: false })
    .limit(500)) as { data: any[] | null }
  const rows = (data ?? []).filter((r) => {
    // Archived rows are hidden from the default list (kept for bookkeeping);
    // the "arsip" view shows only them.
    if (showArchived ? !r.archived_at : !!r.archived_at) return false
    return !q || r.slug?.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Undangan</h1>
      <form style={{ margin: '12px 0' }}>
        <input name="q" defaultValue={searchParams.q || ''} placeholder="Cari slug atau email…"
          style={{ height: 36, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', width: 260 }} />
        {showArchived && <input type="hidden" name="archived" value="1" />}
      </form>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {rows.length} undangan{showArchived ? ' (arsip)' : ''}
        </p>
        <a href={showArchived ? '/admin/invitations' : '/admin/invitations?archived=1'}
          style={{ fontSize: 13, color: 'var(--interactive-primary)' }}>
          {showArchived ? '← Kembali ke daftar aktif' : 'Lihat arsip →'}
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {rows.map((r) => {
          const st = activePeriodStatus(r, Date.now())
          return (
            <InvitationRow key={r.id} inv={{
              id: r.id, slug: r.slug, templateId: r.template_id ?? '', plan: r.plan,
              email: r.email ?? '', isPublished: r.is_published, paidSource: r.paid_source ?? null,
              statusLabel: STATUS_LABEL[st.status] ?? st.status, quotaExtra: r.guest_quota_extra ?? 0,
              isPaid: !!r.is_paid, isSuspended: !!r.suspended_at, isArchived: !!r.archived_at,
            }} />
          )
        })}
      </div>
    </div>
  )
}
