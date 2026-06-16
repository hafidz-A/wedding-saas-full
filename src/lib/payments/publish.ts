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
 * Shared by the Xendit webhook and the manual "recheck payment" action so both
 * compute the expiry the exact same way. The CALLER is responsible for verifying
 * the payment is genuine (PAID status + correct amount) BEFORE calling this —
 * this helper only performs the state transition.
 */
export async function publishPaidInvitation(
  admin: any,
  inv: PublishableInvitation,
  nowMs: number = Date.now(),
): Promise<void> {
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  await (admin.from('invitations') as any)
    .update({
      is_paid: true,
      is_published: true,
      paid_at: new Date(nowMs).toISOString(),
      expires_at: resolved ? resolved.expiresAt(nowMs) : null,
    })
    .eq('id', inv.id)
}
