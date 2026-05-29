import { templateCatalog } from '@/config/templateCatalog'

export interface ResolvedPlan {
  planId: string
  amountIDR: number
  expiresAt: (paidAtMs: number) => string | null
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Resolve a (template, plan) pair to its price + expiry rule.
 * - basic → expires 1 year after payment
 * - premium → lifetime (null)
 * Returns null for an unknown template/plan or a plan without a numeric amount.
 */
export function resolvePlan(templateId: string, planId: string): ResolvedPlan | null {
  const entry = (templateCatalog as Array<{ id: string; plans?: Array<{ id: string; amountIDR?: number }> }>).find(
    (t) => t.id === templateId,
  )
  const plan = entry?.plans?.find((p) => p.id === planId)
  if (!plan || typeof plan.amountIDR !== 'number') return null
  return {
    planId,
    amountIDR: plan.amountIDR,
    expiresAt: (paidAtMs: number) =>
      planId === 'premium' ? null : new Date(paidAtMs + YEAR_MS).toISOString(),
  }
}
