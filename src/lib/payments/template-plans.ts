import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface TemplatePlanRow {
  template_id: string
  plan_code: 'basic' | 'premium'
  display_name: string
  price_idr: number
  duration_days: number | null
  features: string[]
  sort_order: number
}

/**
 * Cache tag for plan pricing. Prices are edited in Supabase Studio (no in-app
 * editor yet), so staleness is bounded by the `revalidate` TTL below rather
 * than tag invalidation — but the tag is wired so a future in-app price editor
 * can `revalidateTag(TEMPLATE_PLANS_TAG)` for instant refresh.
 */
export const TEMPLATE_PLANS_TAG = 'template-plans'
const REVALIDATE_SECONDS = 60

function mapRow(r: any): TemplatePlanRow {
  return {
    template_id: r.template_id,
    plan_code: r.plan_code,
    display_name: r.display_name,
    price_idr: Number(r.price_idr),
    duration_days: r.duration_days == null ? null : Number(r.duration_days),
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    sort_order: Number(r.sort_order),
  }
}

/**
 * Source of truth for plan pricing + features. Reads template_plans from
 * Supabase so the operator can edit prices in Supabase Studio without touching
 * source code. Wrapped in unstable_cache: shared across requests, refreshed at
 * most every 60s. Replaces the old never-expiring module-scoped memo (which
 * never reflected a Studio price edit until the process recycled).
 */
export const getTemplatePlans = unstable_cache(
  async (templateId: string): Promise<TemplatePlanRow[]> => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await (supabase.from('template_plans') as any)
      .select('template_id, plan_code, display_name, price_idr, duration_days, features, sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[getTemplatePlans]', error)
      return []
    }
    return (data ?? []).map(mapRow)
  },
  ['template-plans-by-id'],
  { revalidate: REVALIDATE_SECONDS, tags: [TEMPLATE_PLANS_TAG] },
)

/** Fetch plans for every known template. Used by the public /templates page. */
export const getAllTemplatePlans = unstable_cache(
  async (): Promise<Record<string, TemplatePlanRow[]>> => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await (supabase.from('template_plans') as any)
      .select('template_id, plan_code, display_name, price_idr, duration_days, features, sort_order')
      .order('template_id', { ascending: true })
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[getAllTemplatePlans]', error)
      return {}
    }
    const out: Record<string, TemplatePlanRow[]> = {}
    for (const r of data ?? []) {
      const tid = r.template_id as string
      if (!out[tid]) out[tid] = []
      out[tid].push(mapRow(r))
    }
    return out
  },
  ['template-plans-all'],
  { revalidate: REVALIDATE_SECONDS, tags: [TEMPLATE_PLANS_TAG] },
)

/** Format an IDR amount as "Rp 149.000". */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
