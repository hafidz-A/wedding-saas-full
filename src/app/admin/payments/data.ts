// src/app/admin/payments/data.ts
// Server-only ledger loader shared by the payments page + CSV export action.
import 'server-only'
import type { InitialRow, AddonUpgradeRow, RefundRow } from '@/lib/payments/transactions'

export interface Ledger {
  initials: InitialRow[]
  upgrades: AddonUpgradeRow[]
  addons: AddonUpgradeRow[]
  refunds: RefundRow[]
  paidCount: number
  draftCount: number
}

/** Load the three paid sources + refunds and attach slug to upgrades/add-ons. */
export async function fetchLedger(db: any): Promise<Ledger> {
  const { data: invs } = (await db
    .from('invitations')
    .select('id, slug, paid_amount_idr, paid_source, fee_idr, paid_at, is_paid')
    .limit(5000)) as { data: any[] | null }
  const rows = invs ?? []
  const slugById = new Map<string, string>(rows.map((r) => [r.id, r.slug]))
  const initials: InitialRow[] = rows
    .filter((r) => r.is_paid)
    .map((r) => ({
      id: r.id, slug: r.slug, paid_amount_idr: r.paid_amount_idr,
      paid_source: r.paid_source, fee_idr: r.fee_idr, paid_at: r.paid_at,
    }))
  const paidCount = initials.length
  const draftCount = rows.length - paidCount

  const attach = (arr: any[] | null): AddonUpgradeRow[] =>
    (arr ?? []).map((r) => ({
      id: r.id, invitation_id: r.invitation_id, slug: slugById.get(r.invitation_id) ?? r.invitation_id,
      amount_idr: r.amount_idr, fee_idr: r.fee_idr, paid_at: r.paid_at,
    }))

  const { data: ups } = (await db
    .from('plan_upgrades').select('id, invitation_id, amount_idr, fee_idr, paid_at, status')
    .eq('status', 'paid')) as { data: any[] | null }
  const { data: ads } = (await db
    .from('quota_addons').select('id, invitation_id, amount_idr, fee_idr, paid_at, status')
    .eq('status', 'paid')) as { data: any[] | null }
  const { data: refs } = (await db
    .from('refunds').select('source_type, source_id, status')) as { data: RefundRow[] | null }

  return { initials, upgrades: attach(ups), addons: attach(ads), refunds: refs ?? [], paidCount, draftCount }
}

export interface RefundRequestView {
  id: string
  invitationId: string
  slug: string
  amountIDR: number
  paidSource: string
  category: string
  detail: string | null
  snapshot: any
  createdAt: string
}

/** Pending refund requests joined with the invitation's slug + stored amount. */
export async function fetchRefundRequests(db: any): Promise<RefundRequestView[]> {
  const { data: reqs } = (await db.from('refund_requests')
    .select('id, invitation_id, reason_category, reason_text, usage_snapshot, created_at')
    .eq('status', 'pending').order('created_at', { ascending: true }).limit(200)) as { data: any[] | null }
  const rows = reqs ?? []
  if (!rows.length) return []
  const ids = Array.from(new Set(rows.map((r) => r.invitation_id)))
  const { data: invs } = (await db.from('invitations')
    .select('id, slug, paid_amount_idr, paid_source').in('id', ids)) as { data: any[] | null }
  const map = new Map<string, any>((invs ?? []).map((i) => [i.id, i]))
  return rows.map((r) => {
    const inv = map.get(r.invitation_id)
    return {
      id: r.id, invitationId: r.invitation_id, slug: inv?.slug ?? r.invitation_id,
      amountIDR: Number(inv?.paid_amount_idr ?? 0), paidSource: inv?.paid_source ?? 'xendit',
      category: r.reason_category, detail: r.reason_text, snapshot: r.usage_snapshot ?? {}, createdAt: r.created_at,
    }
  })
}
