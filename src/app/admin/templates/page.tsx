// src/app/admin/templates/page.tsx
import { getAllTemplatePlans } from '@/lib/payments/template-plans'
import { getTemplates } from '@/lib/templates/catalog'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatIDR } from '@/lib/payments/quota'
import PlansEditor from './PlansEditor'
import TemplateEditor from './TemplateEditor'

export const dynamic = 'force-dynamic'

export default async function AdminTemplatesPage() {
  const [templates, byTemplate] = await Promise.all([getTemplates(), getAllTemplatePlans()])

  // Usage + revenue per template — so a popular template isn't disabled by mistake.
  const db = createSupabaseAdminClient()
  const { data: invs } = (await (db.from('invitations') as any)
    .select('template_id, is_paid, paid_amount_idr').limit(5000)) as { data: any[] | null }
  const usage: Record<string, { active: number; revenue: number }> = {}
  for (const r of invs ?? []) {
    const tid = r.template_id ?? ''
    if (!usage[tid]) usage[tid] = { active: 0, revenue: 0 }
    if (r.is_paid) { usage[tid].active++; usage[tid].revenue += Number(r.paid_amount_idr ?? 0) }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Template &amp; Harga</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
        Tiap template punya <strong>Tampilan</strong> (nyala/mati, nama, kategori, tagline, dll — untuk halaman depan) dan <strong>Paket &amp; Harga</strong>. Perubahan langsung berlaku.
      </p>

      {templates.map((tpl) => {
        const u = usage[tpl.id] ?? { active: 0, revenue: 0 }
        const plans = byTemplate[tpl.id] ?? []
        return (
          <section key={tpl.id} style={{ marginTop: 24, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18, margin: 0, textTransform: 'capitalize' }}>
                {tpl.label}
                {!tpl.enabled && <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', textTransform: 'none' }}>nonaktif</span>}
              </h2>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {u.active} undangan berbayar · pendapatan {formatIDR(u.revenue)}
              </span>
            </div>

            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '16px 0 10px' }}>Tampilan</h3>
            <TemplateEditor templateId={tpl.id} initial={tpl} />

            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '20px 0 10px' }}>Paket &amp; Harga</h3>
            {plans.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada data paket untuk template ini.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {plans.map((plan) => (
                  <PlansEditor key={plan.plan_code} templateId={tpl.id} plan={{
                    plan_code: plan.plan_code,
                    display_name: plan.display_name,
                    price_idr: plan.price_idr,
                    compare_at_price_idr: plan.compare_at_price_idr,
                    base_guest_quota: plan.base_guest_quota,
                    duration_days: plan.duration_days,
                    features: plan.features,
                  }} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
