// src/app/admin/templates/actions.ts
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { TEMPLATE_PLANS_TAG } from '@/lib/payments/template-plans'
import { TEMPLATES_TAG } from '@/lib/templates/catalog'
import { validatePlanPatch, type PlanPatch } from './validate'
import { validateTemplatePatch, type TemplatePatch } from './validate-template'

/** Update one plan row + refresh cached reads. Admin-gated + audited. */
export async function updatePlan(templateId: string, planCode: string, patch: PlanPatch): Promise<{ ok: boolean; error?: string }> {
  let admin: { email: string }
  try {
    admin = await requireAdmin()
  } catch {
    return { ok: false, error: 'Akses ditolak' }
  }
  const v = validatePlanPatch(patch)
  if (v.ok === false) return { ok: false, error: v.error }

  const db = createSupabaseAdminClient()
  const { error } = await (db.from('template_plans') as any)
    .update({
      display_name: patch.display_name.trim(),
      price_idr: patch.price_idr,
      compare_at_price_idr: patch.compare_at_price_idr,
      base_guest_quota: patch.base_guest_quota,
      duration_days: patch.duration_days,
      features: patch.features.map((f) => f.trim()),
    })
    .eq('template_id', templateId)
    .eq('plan_code', planCode)
  if (error) {
    console.error('[updatePlan]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  await logAdminAction(admin.email, { action: 'plan.update', targetType: 'template_plan', targetId: `${templateId}/${planCode}` })
  revalidateTag(TEMPLATE_PLANS_TAG)
  return { ok: true }
}

/** Update a template's display metadata + marketing copy. Admin-gated + audited. */
export async function updateTemplate(templateId: string, patch: TemplatePatch): Promise<{ ok: boolean; error?: string }> {
  let admin: { email: string }
  try { admin = await requireAdmin() } catch { return { ok: false, error: 'Akses ditolak' } }
  const v = validateTemplatePatch(patch)
  if (v.ok === false) return { ok: false, error: v.error }

  const db = createSupabaseAdminClient()
  const { error } = await (db.from('templates') as any)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('template_id', templateId)
  if (error) {
    console.error('[updateTemplate]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  await logAdminAction(admin.email, { action: 'template.update', targetType: 'template', targetId: templateId })
  revalidateTag(TEMPLATES_TAG) // marketing + onboarding read getTemplates()
  revalidatePath('/')
  return { ok: true }
}
