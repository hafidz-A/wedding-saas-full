// src/lib/payments/plan-display.ts
// Client-safe plan display shape. TemplatePlanRow is a TYPE import (erased), so
// this file never pulls in the server-only template-plans module at runtime.
import type { TemplatePlanRow } from './template-plans'
import { formatIDR } from './quota'

export interface PlanDisplay {
  id: string
  name: string
  price: string
  amountIDR: number
  compareAtPrice: string | null
  features: string[]
  baseQuota: number
}

export function toPlanDisplay(row: TemplatePlanRow): PlanDisplay {
  const hasDiscount = row.compare_at_price_idr != null && row.compare_at_price_idr > row.price_idr
  return {
    id: row.plan_code,
    name: row.display_name,
    price: formatIDR(row.price_idr),
    amountIDR: row.price_idr,
    compareAtPrice: hasDiscount ? formatIDR(row.compare_at_price_idr as number) : null,
    features: row.features,
    baseQuota: row.base_guest_quota,
  }
}
