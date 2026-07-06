// src/lib/payments/refunds.ts
// Server-only refund helpers. A refund reverses BOTH the money (refunds ledger)
// and the entitlement it bought — add-on → decrement quota, upgrade → revert plan,
// initial → unpublish — so money and product state never drift apart.
import 'server-only'
import { resolvePlan } from './plans'

export type RefundSourceType = 'initial' | 'upgrade' | 'addon'

export interface RefundSource {
  invitationId: string
  amountIDR: number          // the STORED paid amount — never user-supplied
  paidSource: 'xendit' | 'manual' | 'comp'
  xenditInvoiceId: string | null
}

/** Resolve a refundable source to its invitation + stored amount + payment channel. */
export async function loadRefundSource(db: any, sourceType: RefundSourceType, sourceId: string): Promise<RefundSource | null> {
  if (sourceType === 'initial') {
    const { data } = await db.from('invitations')
      .select('id, paid_amount_idr, paid_source, xendit_invoice_id, is_paid').eq('id', sourceId).maybeSingle()
    if (!data || !data.is_paid) return null
    return {
      invitationId: data.id, amountIDR: Number(data.paid_amount_idr ?? 0),
      paidSource: (data.paid_source as any) || 'xendit', xenditInvoiceId: data.xendit_invoice_id ?? null,
    }
  }
  const table = sourceType === 'upgrade' ? 'plan_upgrades' : 'quota_addons'
  const { data } = await db.from(table)
    .select('id, invitation_id, amount_idr, xendit_invoice_id, status').eq('id', sourceId).maybeSingle()
  if (!data || data.status !== 'paid') return null
  return {
    invitationId: data.invitation_id, amountIDR: Number(data.amount_idr ?? 0),
    paidSource: 'xendit', xenditInvoiceId: data.xendit_invoice_id ?? null, // upgrades/add-ons are always Xendit
  }
}

/** True if a source already has a non-failed refund (succeeded or in-flight pending). */
export async function sourceHasOpenRefund(db: any, sourceType: RefundSourceType, sourceId: string): Promise<boolean> {
  const { data } = await db.from('refunds')
    .select('id, status').eq('source_type', sourceType).eq('source_id', sourceId).neq('status', 'failed').limit(1)
  return !!(data && data.length)
}

/** Reverse the entitlement a refunded source granted. Called ONCE per refund
 *  (settleRefund guards against double-reversal via a compare-and-set). */
export async function reverseEntitlement(
  db: any,
  r: { source_type: string; source_id: string | null; invitation_id: string | null },
  nowMs: number = Date.now(),
): Promise<void> {
  if (r.source_type === 'addon' && r.source_id && r.invitation_id) {
    const { data: a } = await db.from('quota_addons').select('qty_guests').eq('id', r.source_id).maybeSingle()
    const qty = Number(a?.qty_guests ?? 0)
    if (qty > 0) {
      const { data: inv } = await db.from('invitations').select('guest_quota_extra').eq('id', r.invitation_id).maybeSingle()
      const next = Math.max(0, Number(inv?.guest_quota_extra ?? 0) - qty)
      await (db.from('invitations') as any).update({ guest_quota_extra: next }).eq('id', r.invitation_id)
    }
  } else if (r.source_type === 'upgrade' && r.source_id) {
    const { data: u } = await db.from('plan_upgrades').select('from_plan, invitation_id').eq('id', r.source_id).maybeSingle()
    if (u?.from_plan && u.invitation_id) {
      const { data: inv } = await db.from('invitations').select('template_id').eq('id', u.invitation_id).maybeSingle()
      const resolved = inv ? await resolvePlan(inv.template_id, u.from_plan) : null
      await (db.from('invitations') as any)
        .update({ plan: u.from_plan, expires_at: resolved ? resolved.expiresAt(nowMs) : null })
        .eq('id', u.invitation_id)
    }
  } else if (r.source_type === 'initial' && r.invitation_id) {
    // Money back ⇒ the product comes down.
    await (db.from('invitations') as any).update({ is_published: false }).eq('id', r.invitation_id)
  }
}

/**
 * Mark a refund SUCCEEDED and reverse its entitlement — exactly once. Uses a
 * compare-and-set (update … where status != 'succeeded') as a lock so a re-sent
 * refund webhook can't double-reverse (e.g. decrement quota twice). Returns true
 * when the row is (now or already) succeeded.
 */
export async function settleRefund(db: any, refundId: string, nowMs: number = Date.now()): Promise<boolean> {
  const { data: locked } = await (db.from('refunds') as any)
    .update({ status: 'succeeded', confirmed_at: new Date(nowMs).toISOString() })
    .eq('id', refundId).neq('status', 'succeeded').select('id, invitation_id, source_type, source_id')
  if (!locked || locked.length === 0) return true // already settled by someone else (idempotent)
  await reverseEntitlement(db, locked[0], nowMs)
  return true
}
