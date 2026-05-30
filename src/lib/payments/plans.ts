import 'server-only'
import { getTemplatePlans, type TemplatePlanRow } from './template-plans'

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
