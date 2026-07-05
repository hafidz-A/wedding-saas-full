import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AdminOverview() {
  const admin = createSupabaseAdminClient()
  const { count: invitations } = await (admin.from('invitations') as any)
    .select('id', { count: 'exact', head: true })
  const { count: paid } = await (admin.from('invitations') as any)
    .select('id', { count: 'exact', head: true }).eq('is_paid', true)
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Ringkasan</h1>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <Metric label="Undangan" value={invitations ?? 0} />
        <Metric label="Sudah bayar" value={paid ?? 0} />
        <Metric label="Draft" value={(invitations ?? 0) - (paid ?? 0)} />
      </div>
      {/* Revenue + "needs attention" counts are wired as modules 3/5 land. */}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: 16, minWidth: 120 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
