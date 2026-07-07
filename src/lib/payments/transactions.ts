/**
 * Pure transaction/revenue helpers for /admin/payments.
 *
 * The ledger is the UNION of three paid sources — initial purchase (invitations),
 * plan upgrades, quota add-ons — each mapped to one `Transaction` shape. A source
 * is "refunded" iff a succeeded `refunds` row references it (`type:source_id`).
 *
 * NO DB / no I/O here — everything is a pure function so the money math is unit-
 * tested. Report boundaries use Asia/Jakarta (WIB, fixed +7, no DST).
 */

export type TxnType = 'initial' | 'upgrade' | 'addon'
export type TxnSource = 'xendit' | 'manual' | 'comp'
export type TxnStatus = 'paid' | 'refunded'

export interface Transaction {
  /** `${type}:${sourceId}` — matches a refunds row's (source_type, source_id). */
  key: string
  invitationId: string
  slug: string
  plan: string
  templateId: string
  type: TxnType
  amountIDR: number
  feeIDR: number
  source: TxnSource
  status: TxnStatus
  date: string // ISO paid_at
}

export interface InitialRow {
  id: string; slug: string; plan?: string; template_id?: string
  paid_amount_idr: number | null; paid_source: string | null; fee_idr: number | null; paid_at: string | null
}
export interface AddonUpgradeRow {
  id: string; invitation_id: string; slug: string; plan?: string; template_id?: string
  amount_idr: number | null; fee_idr: number | null; paid_at: string | null
}
export interface RefundRow { source_type: string; source_id: string | null; status: string }

/** Keys (`type:source_id`) that have a SUCCEEDED refund — i.e. fully refunded. */
export function refundedKeySet(refunds: RefundRow[]): Set<string> {
  const s = new Set<string>()
  for (const r of refunds) if (r.status === 'succeeded' && r.source_id) s.add(`${r.source_type}:${r.source_id}`)
  return s
}

export function mapInitial(inv: InitialRow, refunded: Set<string>): Transaction {
  const key = `initial:${inv.id}`
  const source: TxnSource =
    inv.paid_source === 'manual' ? 'manual' : inv.paid_source === 'comp' ? 'comp' : 'xendit'
  return {
    key, invitationId: inv.id, slug: inv.slug, plan: inv.plan ?? '', templateId: inv.template_id ?? '', type: 'initial',
    amountIDR: Number(inv.paid_amount_idr ?? 0), feeIDR: Number(inv.fee_idr ?? 0),
    source, status: refunded.has(key) ? 'refunded' : 'paid', date: inv.paid_at ?? '',
  }
}

/** Upgrades + add-ons are always Xendit-paid (there is no offline path for them). */
function mapAux(type: 'upgrade' | 'addon', r: AddonUpgradeRow, refunded: Set<string>): Transaction {
  const key = `${type}:${r.id}`
  return {
    key, invitationId: r.invitation_id, slug: r.slug, plan: r.plan ?? '', templateId: r.template_id ?? '', type,
    amountIDR: Number(r.amount_idr ?? 0), feeIDR: Number(r.fee_idr ?? 0),
    source: 'xendit', status: refunded.has(key) ? 'refunded' : 'paid', date: r.paid_at ?? '',
  }
}

export function buildTransactions(input: {
  initials: InitialRow[]; upgrades: AddonUpgradeRow[]; addons: AddonUpgradeRow[]; refunds: RefundRow[]
}): Transaction[] {
  const refunded = refundedKeySet(input.refunds)
  const txns = [
    ...input.initials.map((i) => mapInitial(i, refunded)),
    ...input.upgrades.map((u) => mapAux('upgrade', u, refunded)),
    ...input.addons.map((a) => mapAux('addon', a, refunded)),
  ]
  return txns.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export interface RevenueSummary {
  grossIDR: number       // paid, non-comp, non-refunded
  feesIDR: number        // gateway fees on those
  netIDR: number         // gross − fees (refunds already excluded from gross)
  refundedIDR: number    // sum of refunded amounts (shown separately)
  compCount: number      // number of free comps (Rp 0)
  bySource: Record<TxnSource, number>
  byType: Record<TxnType, number>
  byPlan: Record<string, number>
  byTemplate: Record<string, number>
  count: number          // count of paid (non-comp, non-refunded) txns
}

/** Summarize a list of transactions (optionally pre-filtered by the caller). */
export function summarize(txns: Transaction[]): RevenueSummary {
  const s: RevenueSummary = {
    grossIDR: 0, feesIDR: 0, netIDR: 0, refundedIDR: 0, compCount: 0,
    bySource: { xendit: 0, manual: 0, comp: 0 }, byType: { initial: 0, upgrade: 0, addon: 0 },
    byPlan: {}, byTemplate: {}, count: 0,
  }
  for (const t of txns) {
    if (t.status === 'refunded') { s.refundedIDR += t.amountIDR; continue }
    if (t.source === 'comp') { s.compCount += 1; continue }
    s.grossIDR += t.amountIDR
    s.feesIDR += t.feeIDR
    s.bySource[t.source] += t.amountIDR
    s.byType[t.type] += t.amountIDR
    if (t.plan) s.byPlan[t.plan] = (s.byPlan[t.plan] ?? 0) + t.amountIDR
    if (t.templateId) s.byTemplate[t.templateId] = (s.byTemplate[t.templateId] ?? 0) + t.amountIDR
    s.count += 1
  }
  s.netIDR = s.grossIDR - s.feesIDR
  return s
}

/** 'YYYY-MM' of an ISO date in WIB (fixed +7, no DST). Empty string if unparseable. */
export function jakartaYearMonth(iso: string): string {
  const t = Date.parse(iso || '')
  if (isNaN(t)) return ''
  return new Date(t + 7 * 3_600_000).toISOString().slice(0, 7)
}

export interface MonthPoint { month: string; grossIDR: number }

/** Gross revenue per month for the last `n` months (WIB), oldest→newest. */
export function monthlyTrend(txns: Transaction[], nowMs: number, n = 12): MonthPoint[] {
  const months: string[] = []
  const d = new Date(nowMs + 7 * 3_600_000)
  let y = d.getUTCFullYear(); let m = d.getUTCMonth() // 0-based, already shifted to WIB
  for (let i = 0; i < n; i++) {
    months.unshift(`${y}-${String(m + 1).padStart(2, '0')}`)
    m -= 1; if (m < 0) { m = 11; y -= 1 }
  }
  const totals = new Map<string, number>(months.map((mm) => [mm, 0]))
  for (const t of txns) {
    if (t.status === 'refunded' || t.source === 'comp') continue
    const ym = jakartaYearMonth(t.date)
    if (totals.has(ym)) totals.set(ym, (totals.get(ym) as number) + t.amountIDR)
  }
  return months.map((month) => ({ month, grossIDR: totals.get(month) as number }))
}

export interface Conversion { paid: number; drafts: number; total: number; ratePct: number }

export function conversion(paidCount: number, draftCount: number): Conversion {
  const total = paidCount + draftCount
  return { paid: paidCount, drafts: draftCount, total, ratePct: total ? Math.round((paidCount / total) * 100) : 0 }
}

/* ── CSV (financial fields only — NEVER guest PII) ── */

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function transactionsToCsv(txns: Transaction[]): string {
  const header = ['slug', 'tipe', 'sumber', 'status', 'jumlah_idr', 'fee_idr', 'tanggal']
  const lines = [header.join(',')]
  for (const t of txns) {
    lines.push([t.slug, t.type, t.source, t.status, t.amountIDR, t.feeIDR, t.date].map(csvCell).join(','))
  }
  return lines.join('\n')
}

/** Rp 149.000 — same grouping the marketing/onboarding surfaces use. */
export function formatIDR(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
}
