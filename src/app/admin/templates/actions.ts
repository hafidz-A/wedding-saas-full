// src/app/admin/templates/actions.ts
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { TEMPLATE_PLANS_TAG } from '@/lib/payments/template-plans'
import { TEMPLATES_TAG } from '@/lib/templates/catalog'
import { isValidTemplate } from '@/config/templateIndex'
import { getCatalogEntry } from '@/config/templateCatalog'
import { validatePlanPatch, type PlanPatch } from './validate'
import { validateTemplatePatch, type TemplatePatch } from './validate-template'

/**
 * Save one plan row (update, or insert if missing) + refresh cached reads.
 * Admin-gated + audited.
 *
 * Why not a bare UPDATE: a plain UPDATE that matches no row — a template whose
 * plans were never seeded, or a row lost to a DB reset — reports success while
 * writing nothing. The operator "saves" a price that never lands, and because
 * pricing now has no hardcoded fallback, the plan silently shows up empty. So
 * when the row is absent we insert it. Existing rows keep the exact old UPDATE
 * semantics (only the edited columns are touched).
 */
export async function updatePlan(templateId: string, planCode: string, patch: PlanPatch): Promise<{ ok: boolean; error?: string }> {
  let admin: { email: string }
  try {
    admin = await requireAdmin()
  } catch {
    return { ok: false, error: 'Akses ditolak' }
  }
  // plan_code is part of the PK and a CHECK constraint — must be known before we
  // might INSERT it. (A bad code used to be a silent no-op; now it's an error.)
  if (planCode !== 'basic' && planCode !== 'premium') return { ok: false, error: 'Kode paket tidak dikenal' }
  const v = validatePlanPatch(patch)
  if (v.ok === false) return { ok: false, error: v.error }

  const cols = {
    display_name: patch.display_name.trim(),
    price_idr: patch.price_idr,
    compare_at_price_idr: patch.compare_at_price_idr,
    base_guest_quota: patch.base_guest_quota,
    duration_days: patch.duration_days,
    features: patch.features.map((f) => f.trim()),
  }

  const db = createSupabaseAdminClient()
  const { data: updated, error } = await (db.from('template_plans') as any)
    .update(cols)
    .eq('template_id', templateId)
    .eq('plan_code', planCode)
    .select('plan_code')
  if (error) {
    console.error('[updatePlan]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  let created = false
  if (!updated || updated.length === 0) {
    // Row absent → seed it. sort_order is deterministic: basic before premium.
    const { error: insErr } = await (db.from('template_plans') as any).insert({
      template_id: templateId,
      plan_code: planCode,
      sort_order: planCode === 'premium' ? 2 : 1,
      ...cols,
    })
    if (insErr) {
      console.error('[updatePlan:insert]', insErr)
      return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
    }
    created = true
  }

  await logAdminAction(admin.email, { action: 'plan.update', targetType: 'template_plan', targetId: `${templateId}/${planCode}`, meta: created ? { created: true } : undefined })
  revalidateTag(TEMPLATE_PLANS_TAG)
  return { ok: true }
}

/**
 * Save a template's display metadata + marketing copy (update, or insert if
 * missing). Admin-gated + audited.
 *
 * Same update-then-insert reasoning as updatePlan. The insert path rebuilds a
 * COMPLETE row from the code catalog defaults overlaid with this patch, so a
 * partial edit (e.g. toggling `enabled`) can never insert a row with a null
 * label/accent that would shadow the code fallback in getTemplates().
 */
export async function updateTemplate(templateId: string, patch: TemplatePatch): Promise<{ ok: boolean; error?: string }> {
  let admin: { email: string }
  try { admin = await requireAdmin() } catch { return { ok: false, error: 'Akses ditolak' } }
  if (!isValidTemplate(templateId)) return { ok: false, error: 'Template tidak dikenal' }
  const v = validateTemplatePatch(patch)
  if (v.ok === false) return { ok: false, error: v.error }

  // Whitelist columns — never spread the raw patch, so a crafted call can't write
  // template_id (the PK), updated_at, or any unexpected column (no mass-assignment).
  const cols: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const ALLOWED = ['enabled', 'label', 'category', 'tags', 'accent', 'thumbnail', 'sort_order', 'tagline_id', 'tagline_en', 'blurb_id', 'blurb_en'] as const
  for (const k of ALLOWED) if (k in patch) cols[k] = (patch as any)[k]

  const db = createSupabaseAdminClient()
  const { data: updated, error } = await (db.from('templates') as any)
    .update(cols)
    .eq('template_id', templateId)
    .select('template_id')
  if (error) {
    console.error('[updateTemplate]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  let created = false
  if (!updated || updated.length === 0) {
    // Row absent → insert a complete row: code catalog defaults, then this patch.
    const base = getCatalogEntry(templateId)
    const { error: insErr } = await (db.from('templates') as any).insert({
      template_id: templateId,
      enabled: true,
      label: base.label,
      category: base.category,
      tags: base.tags,
      accent: base.accent,
      thumbnail: base.thumbnail,
      sort_order: 0,
      tagline_id: '', tagline_en: '',
      blurb_id: base.description ?? '', blurb_en: base.description ?? '',
      ...cols,
    })
    if (insErr) {
      console.error('[updateTemplate:insert]', insErr)
      return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
    }
    created = true
  }

  await logAdminAction(admin.email, { action: 'template.update', targetType: 'template', targetId: templateId, meta: created ? { created: true } : undefined })
  revalidateTag(TEMPLATES_TAG) // marketing + onboarding read getTemplates()
  revalidatePath('/')
  return { ok: true }
}
