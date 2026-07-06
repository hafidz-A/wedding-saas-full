// src/app/admin/templates/page.tsx
import { getAllTemplatePlans } from '@/lib/payments/template-plans'
import PlansEditor from './PlansEditor'

export default async function AdminTemplatesPage() {
  const byTemplate = await getAllTemplatePlans()
  const templates = Object.keys(byTemplate).sort()
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Template & Harga</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
        Ubah harga, kuota tamu, fitur, masa aktif, dan harga coret tiap paket. Perubahan langsung berlaku.
      </p>
      {templates.length === 0 && <p style={{ marginTop: 16 }}>Belum ada data paket di database.</p>}
      {templates.map((tid) => (
        <section key={tid} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, textTransform: 'capitalize' }}>{tid}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            {byTemplate[tid].map((plan) => (
              <PlansEditor key={plan.plan_code} templateId={tid} plan={{
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
        </section>
      ))}
    </div>
  )
}
