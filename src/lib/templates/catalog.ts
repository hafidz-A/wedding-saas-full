// src/lib/templates/catalog.ts
import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { templateCatalog } from '@/config/templateCatalog'
import { toTemplateDisplay, type TemplateDisplay } from './display'

/** Cache tag — the template editor calls revalidateTag(TEMPLATES_TAG) on save. */
export const TEMPLATES_TAG = 'templates'
const REVALIDATE_SECONDS = 60

/** Code fallback (from the static templateCatalog) when the DB is empty/unreachable. */
function codeFallback(): TemplateDisplay[] {
  return templateCatalog.map((c: any, i: number) =>
    toTemplateDisplay({
      template_id: c.id, enabled: true, label: c.label, category: c.category,
      tags: c.tags, accent: c.accent, thumbnail: c.thumbnail, sort_order: i,
      tagline_id: '', tagline_en: '', blurb_id: c.description, blurb_en: c.description,
    }),
  )
}

/**
 * All templates (enabled + disabled), sorted by sort_order — source of truth for
 * marketing + the admin editor. Cached like template_plans; the editor bumps the
 * tag on save. Falls back to code so the marketing page never breaks on a DB blip.
 */
export const getTemplates = unstable_cache(
  async (): Promise<TemplateDisplay[]> => {
    const db = createSupabaseAdminClient()
    const { data, error } = await (db.from('templates') as any)
      .select('template_id, enabled, label, category, tags, accent, thumbnail, sort_order, tagline_id, tagline_en, blurb_id, blurb_en')
      .order('sort_order', { ascending: true })
    if (error || !data || data.length === 0) {
      if (error) console.error('[getTemplates]', error)
      return codeFallback()
    }
    return data.map(toTemplateDisplay)
  },
  ['templates-all'],
  { revalidate: REVALIDATE_SECONDS, tags: [TEMPLATES_TAG] },
)
