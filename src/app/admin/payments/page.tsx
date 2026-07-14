// src/app/admin/payments/page.tsx
// Admin: Payments & revenue. Gated by src/app/admin/layout.tsx (requireAdmin).
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  buildTransactions, summarize, monthlyTrend, conversion, jakartaYearMonth, formatIDR,
  type MonthPoint,
} from '@/lib/payments/transactions'
import { fetchLedger, fetchRefundRequests } from './data'
import PaymentsClient from './PaymentsClient'
import ReconcilePanel from './ReconcilePanel'
import RefundRequestsPanel from './RefundRequestsPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const db = createSupabaseAdminClient()
  const ledger = await fetchLedger(db)
  const txns = buildTransactions(ledger)
  const now = Date.now()
  const summary = summarize(txns)
  const thisMonth = jakartaYearMonth(new Date(now).toISOString())
  const monthSummary = summarize(txns.filter((t) => jakartaYearMonth(t.date) === thisMonth))
  const trend = monthlyTrend(txns, now, 12)
  const conv = conversion(ledger.paidCount, ledger.draftCount)
  const missingAmounts = ledger.initials.filter((i) => i.paid_amount_idr == null).length
  const refundRequests = await fetchRefundRequests(db)

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Pembayaran &amp; Pendapatan</h1>

      {missingAmounts > 0 && (
        <div style={{ margin: '10px 0', padding: 12, border: '1px solid var(--status-error)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          <strong>{missingAmounts} undangan berbayar</strong> belum tercatat nominalnya (dibayar sebelum fitur ini).
          Klik <em>“Isi angka lama”</em> di bawah supaya pendapatan historis akurat.
        </div>
      )}

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
        <Card label="Masuk kotor (semua waktu)" value={formatIDR(summary.grossIDR)} sub={`${summary.count} transaksi`} />
        <Card label="Bersih diterima" value={formatIDR(summary.netIDR)} sub={summary.feesIDR > 0 ? `setelah fee ${formatIDR(summary.feesIDR)}` : 'fee Midtrans belum tercatat (≈ kotor)'} />
        <Card label="Bulan ini (WIB)" value={formatIDR(monthSummary.grossIDR)} sub={`${monthSummary.count} transaksi`} />
        <Card label="Direfund" value={formatIDR(summary.refundedIDR)} sub={summary.compCount ? `${summary.compCount} comp (gratis)` : '—'} />
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
        <Card small label="Midtrans" value={formatIDR(summary.bySource.midtrans)} />
        <Card small label="Manual (offline)" value={formatIDR(summary.bySource.manual)} />
        <Card small label="Conversion draft→bayar" value={`${conv.ratePct}%`} sub={`${conv.paid} bayar · ${conv.drafts} draft`} />
      </section>

      {(Object.keys(summary.byPlan).length > 0 || Object.keys(summary.byTemplate).length > 0) && (
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
          {Object.entries(summary.byPlan).map(([plan, amt]) => <Card small key={`p-${plan}`} label={`Plan ${plan}`} value={formatIDR(amt)} />)}
          {Object.entries(summary.byTemplate).map(([tpl, amt]) => <Card small key={`t-${tpl}`} label={`Template ${tpl}`} value={formatIDR(amt)} />)}
        </section>
      )}

      <section style={{ margin: '18px 0' }}>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Tren pendapatan (12 bulan, WIB)</h2>
        <TrendChart points={trend} />
      </section>

      <RefundRequestsPanel requests={refundRequests} />

      <ReconcilePanel />

      <PaymentsClient
        txns={txns}
        canBackfill={missingAmounts > 0}
      />
    </div>
  )
}

function Card({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: small ? '10px 14px' : 14, minWidth: small ? 150 : 180, flex: small ? '0 0 auto' : 1 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: small ? 18 : 22, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/** Dependency-free CSS/SVG bar chart (no chart lib — the project ships none). */
function TrendChart({ points }: { points: MonthPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.grossIDR))
  const W = 720, H = 140, pad = 24, n = points.length
  const bw = (W - pad * 2) / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto', overflow: 'visible' }} role="img" aria-label="Grafik tren pendapatan bulanan">
      {points.map((p, i) => {
        const h = Math.round(((H - pad * 2) * p.grossIDR) / max)
        const x = pad + i * bw
        const y = H - pad - h
        return (
          <g key={p.month}>
            <rect x={x + 3} y={y} width={Math.max(2, bw - 6)} height={h} rx={3} fill="var(--interactive-primary)" opacity={p.grossIDR ? 0.85 : 0.15}>
              <title>{`${p.month}: ${formatIDR(p.grossIDR)}`}</title>
            </rect>
            <text x={x + bw / 2} y={H - pad + 12} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{p.month.slice(5)}</text>
          </g>
        )
      })}
    </svg>
  )
}
