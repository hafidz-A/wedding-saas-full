import 'server-only'
import { getTemplatePlans, type TemplatePlanRow } from './template-plans'
import { DEFAULT_BASE_QUOTA } from './quota'

export interface ResolvedPlan {
  planId: string
  amountIDR: number
  expiresAt: (paidAtMs: number) => string | null
}

/**
 * Pure helper: resolve a plan row by code. Exported separately so tests
 * can run against synthetic data without touching the database.
 */
export function resolvePlanFrom(
  plans: TemplatePlanRow[],
  planId: string,
): ResolvedPlan | null {
  const plan = plans.find((p) => p.plan_code === planId)
  if (!plan) return null
  const durationDays = plan.duration_days
  return {
    planId,
    amountIDR: plan.price_idr,
    expiresAt: (paidAtMs: number) => {
      if (durationDays == null) return null
      return new Date(paidAtMs + durationDays * 86_400_000).toISOString()
    },
  }
}

/**
 * Resolve a (template, plan) pair to its price + expiry rule, reading
 * from the `template_plans` Supabase table (DB-driven pricing).
 *
 *   duration_days = NULL → lifetime (expiresAt returns null)
 *   duration_days = N    → expires N days after payment
 *
 * Returns null for an unknown template/plan.
 */
export async function resolvePlan(
  templateId: string,
  planId: string,
): Promise<ResolvedPlan | null> {
  const plans = await getTemplatePlans(templateId)
  return resolvePlanFrom(plans, planId)
}

/** Whether the plan unlocks the guestbook ("buku tamu") attendance ledger. */
export function planHasGuestbook(planCode: string): boolean {
  return planCode === 'premium'
}

/** Base guest quota included in a plan, from template_plans (fallback 200). */
export function planBaseQuota(plans: TemplatePlanRow[], planCode: string): number {
  const row = plans.find((p) => p.plan_code === planCode)
  if (row && typeof row.base_guest_quota === 'number') return row.base_guest_quota
  return DEFAULT_BASE_QUOTA[planCode] ?? 400
}

/**
 * Pure helper: the rupiah amount to charge for upgrading from one plan to
 * another within the same template — the price difference.
 *
 *   - Unknown `toPlan` (not sellable) → null (no upgrade possible).
 *   - Unknown `fromPlan` (e.g. legacy 'free', not in template_plans) → treated
 *     as price 0, so the full target price is charged.
 *   - Same/cheaper target → 0 (caller should reject; nothing to pay).
 */
export function computeUpgradeAmount(
  plans: TemplatePlanRow[],
  fromPlan: string,
  toPlan: string,
): number | null {
  const to = plans.find((p) => p.plan_code === toPlan)
  if (!to) return null
  const from = plans.find((p) => p.plan_code === fromPlan)
  const fromPrice = from ? from.price_idr : 0
  return Math.max(0, to.price_idr - fromPrice)
}

export interface ResolvedUpgrade {
  amountIDR: number
  toPlan: string
  /** expiry stamp for the target plan, given the payment time */
  expiresAt: (paidAtMs: number) => string | null
}

/**
 * DB-backed: resolve an upgrade (price difference + the target plan's expiry
 * rule). Returns null when the target plan is unknown or there is nothing to
 * charge (already at/above the target).
 */
export async function resolveUpgrade(
  templateId: string,
  fromPlan: string,
  toPlan: string,
): Promise<ResolvedUpgrade | null> {
  const plans = await getTemplatePlans(templateId)
  const amountIDR = computeUpgradeAmount(plans, fromPlan, toPlan)
  if (amountIDR == null || amountIDR <= 0) return null
  const target = resolvePlanFrom(plans, toPlan)
  if (!target) return null
  return { amountIDR, toPlan, expiresAt: target.expiresAt }
}
