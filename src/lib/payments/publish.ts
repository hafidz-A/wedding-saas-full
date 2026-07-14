import 'server-only'
import { resolvePlan } from './plans'

export interface PublishableInvitation {
  id: string
  plan: string
  template_id: string
}

export interface PaidUpgrade {
  id: string            // plan_upgrades row id
  invitation_id: string
  to_plan: string
  template_id: string   // of the invitation, to resolve the target expiry
}

/**
 * Apply a verified, PAID plan upgrade: bump the invitation to the target plan
 * and recompute its active period from the target plan's duration (Premium =
 * lifetime = no expiry). Crucially this does NOT touch is_paid / is_published —
 * the invitation is already live and must stay up. Then marks the upgrade row
 * paid. The CALLER must verify the payment (PAID + correct amount) first.
 */
export async function applyPaidUpgrade(
  admin: any,
  upgrade: PaidUpgrade,
  nowMs: number = Date.now(),
): Promise<void> {
  const resolved = await resolvePlan(upgrade.template_id, upgrade.to_plan)
  await (admin.from('invitations') as any)
    .update({
      plan: upgrade.to_plan,
      expires_at: resolved ? resolved.expiresAt(nowMs) : null,
    })
    .eq('id', upgrade.invitation_id)
  await (admin.from('plan_upgrades') as any)
    .update({ status: 'paid', paid_at: new Date(nowMs).toISOString() })
    .eq('id', upgrade.id)
}

export interface PaidQuotaAddon {
  id: string            // quota_addons row id
  invitation_id: string
  qty_guests: number    // multiple of 50
}

/**
 * Apply a verified, PAID quota add-on: atomically bump the invitation's
 * guest_quota_extra by qty_guests (via the increment RPC, so concurrent paid
 * callbacks can't lose an update), then mark the addon row paid. Crucially this
 * does NOT touch plan / is_paid / is_published / expires_at — a quota top-up
 * never changes the plan or the live state. The CALLER must verify the payment
 * (PAID + correct amount) first.
 */
export async function applyPaidQuotaAddon(
  admin: any,
  addon: PaidQuotaAddon,
  nowMs: number = Date.now(),
): Promise<void> {
  await admin.rpc('increment_guest_quota_extra', {
    p_invitation_id: addon.invitation_id,
    p_qty: addon.qty_guests,
  })
  await (admin.from('quota_addons') as any)
    .update({ status: 'paid', paid_at: new Date(nowMs).toISOString() })
    .eq('id', addon.id)
}

/**
 * Apply a verified, PAID renewal: recompute the active period from the CURRENT
 * plan's duration (Premium = lifetime = no expiry) and re-publish. Does NOT
 * touch is_paid or the plan — a renewal extends the same plan, never changes it.
 * The CALLER must verify the payment (PAID + correct amount) first.
 */
export async function extendActivePeriod(
  admin: any,
  inv: PublishableInvitation,
  nowMs: number = Date.now(),
): Promise<void> {
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  await (admin.from('invitations') as any)
    .update({
      is_published: true,
      expires_at: resolved ? resolved.expiresAt(nowMs) : null,
    })
    .eq('id', inv.id)
}

/**
 * Flip an invitation to paid + published and stamp its active period.
 *
 * Shared by the payment webhook and the manual "recheck payment" action so both
 * compute the expiry the exact same way. The CALLER is responsible for verifying
 * the payment is genuine (PAID status + correct amount) BEFORE calling this —
 * this helper only performs the state transition.
 */
export async function publishPaidInvitation(
  admin: any,
  inv: PublishableInvitation,
  nowMs: number = Date.now(),
  opts: {
    paidAmountIDR?: number | null; feeIDR?: number | null; paidSource?: string
    paidChannel?: string | null; gatewayTxnId?: string | null
  } = {},
): Promise<void> {
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const patch: Record<string, unknown> = {
    is_paid: true,
    is_published: true,
    paid_at: new Date(nowMs).toISOString(),
    expires_at: resolved ? resolved.expiresAt(nowMs) : null,
  }
  // Additive money-capture (Module 3): record what was actually charged + how it
  // was paid, so revenue never has to be recomputed from a (mutable) price later.
  if (opts.paidAmountIDR != null) patch.paid_amount_idr = opts.paidAmountIDR
  if (opts.feeIDR != null) patch.fee_idr = opts.feeIDR
  if (opts.paidSource) patch.paid_source = opts.paidSource
  // Channel + gateway txn id captured at paid time — refund routing (canApiRefund)
  // depends on paid_channel being recorded here.
  if (opts.paidChannel != null) patch.paid_channel = opts.paidChannel
  if (opts.gatewayTxnId != null) patch.gateway_txn_id = opts.gatewayTxnId
  await (admin.from('invitations') as any).update(patch).eq('id', inv.id)
}
