import 'server-only'
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
 * Source of truth for plan pricing + features. Reads template_plans from
 * Supabase so the operator can edit prices in Supabase Studio without
 * touching source code.
 *
 * Cached per request via Next's fetch-like dedupe (we use Supabase Admin
 * directly, so caching here is just a module-scoped in-memory map keyed
 * by template_id — fine because Server Components are short-lived).
 */
const memo = new Map<string, TemplatePlanRow[]>()

export async function getTemplatePlans(templateId: string): Promise<TemplatePlanRow[]> {
  const cached = memo.get(templateId)
  if (cached) return cached
  const supabase = createSupabaseAdminClient()
  const { data, error } = await (supabase.from('template_plans') as any)
    .select('template_id, plan_code, display_name, price_idr, duration_days, features, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('[getTemplatePlans]', error)
    return []
  }
  const rows = (data ?? []).map((r: any) => ({
    template_id: r.template_id,
    plan_code: r.plan_code,
    display_name: r.display_name,
    price_idr: Number(r.price_idr),
    duration_days: r.duration_days == null ? null : Number(r.duration_days),
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    sort_order: Number(r.sort_order),
  })) as TemplatePlanRow[]
  memo.set(templateId, rows)
  return rows
}

/** Fetch plans for every known template. Used by the public /templates page. */
export async function getAllTemplatePlans(): Promise<Record<string, TemplatePlanRow[]>> {
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
    out[tid].push({
      template_id: tid,
      plan_code: r.plan_code,
      display_name: r.display_name,
      price_idr: Number(r.price_idr),
      duration_days: r.duration_days == null ? null : Number(r.duration_days),
      features: Array.isArray(r.features) ? (r.features as string[]) : [],
      sort_order: Number(r.sort_order),
    })
  }
  return out
}

/** Format an IDR amount as "Rp 149.000". */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
