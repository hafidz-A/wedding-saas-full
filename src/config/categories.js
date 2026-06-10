/* ============================================================================
   INVITATION CATEGORIES — the top-level grouping for templates.

   A category is "active" once at least one template declares it (see
   templateCatalog.js / vibeData.ts `category` field). Categories with no
   template yet render as "coming soon" so the homepage signals what's planned
   without faking previews.

   To add a real new category (e.g. Birthday): build birthday templates, set
   their `category: 'birthday'`, and it lights up here automatically.
   ============================================================================ */
export const CATEGORIES = [
  { id: 'wedding', label: { id: 'Pernikahan', en: 'Wedding' } },
  { id: 'birthday', label: { id: 'Ulang Tahun', en: 'Birthday' } },
  { id: 'aqiqah', label: { id: 'Aqiqah', en: 'Aqiqah' } },
  { id: 'graduation', label: { id: 'Wisuda', en: 'Graduation' } },
  { id: 'corporate', label: { id: 'Korporat', en: 'Corporate' } },
]

export const DEFAULT_CATEGORY = 'wedding'

export function categoryLabel(id, lang) {
  const c = CATEGORIES.find((x) => x.id === id)
  return c ? c.label[lang] ?? c.label.en : id
}
