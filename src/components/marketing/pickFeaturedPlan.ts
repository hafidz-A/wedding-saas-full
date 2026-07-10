import type { PlanDisplay } from '@/lib/payments/plan-display'

/**
 * The plan to highlight ("Paling populer") in the plans popup: the highest-priced
 * plan. Ties resolve to the LATER plan in the list (so Premium wins over an
 * equal-priced Basic listed before it). Returns null for an empty list so the
 * caller can render without a featured card.
 */
export function pickFeaturedPlanId(plans: PlanDisplay[]): string | null {
  if (plans.length === 0) return null
  let featured = plans[0]
  for (const p of plans) {
    if (p.amountIDR >= featured.amountIDR) featured = p
  }
  return featured.id
}
