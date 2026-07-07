// src/app/admin/templates/validate-template.ts
// Pure validation for a template display patch. NOT a 'use server' file — imported
// by both the server action and the client editor (for the type).
import { CATEGORIES } from '@/config/categories'

export interface TemplatePatch {
  enabled?: boolean
  label?: string
  category?: string
  tags?: string[]
  accent?: string
  thumbnail?: string
  sort_order?: number
  tagline_id?: string
  tagline_en?: string
  blurb_id?: string
  blurb_en?: string
}

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id))
const isHexColor = (s: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)

/** Both-or-neither + both-non-empty for a bilingual pair. */
function bilingual(a: string | undefined, b: string | undefined, name: string): { ok: true } | { ok: false; error: string } {
  if (a === undefined && b === undefined) return { ok: true }
  if (!(a ?? '').trim() || !(b ?? '').trim()) return { ok: false, error: `${name} wajib diisi untuk ID dan EN` }
  return { ok: true }
}

export function validateTemplatePatch(p: TemplatePatch): { ok: true } | { ok: false; error: string } {
  if (p.label !== undefined && !p.label.trim()) return { ok: false, error: 'Nama template wajib diisi' }
  if (p.category !== undefined && !CATEGORY_IDS.has(p.category)) return { ok: false, error: 'Kategori tidak dikenal' }
  if (p.accent !== undefined && !isHexColor(p.accent)) return { ok: false, error: 'Warna aksen harus hex (mis. #E8553E)' }
  if (p.thumbnail !== undefined && p.thumbnail !== '' && !/^(https?:\/\/|\/)/.test(p.thumbnail)) return { ok: false, error: 'Thumbnail harus URL/path yang valid' }
  if (p.sort_order !== undefined && (!Number.isInteger(p.sort_order) || p.sort_order < 0)) return { ok: false, error: 'Urutan harus angka bulat ≥ 0' }
  if (p.tags !== undefined && (!Array.isArray(p.tags) || p.tags.some((t) => typeof t !== 'string'))) return { ok: false, error: 'Tags tidak valid' }
  const tl = bilingual(p.tagline_id, p.tagline_en, 'Tagline'); if (!tl.ok) return tl
  const bl = bilingual(p.blurb_id, p.blurb_en, 'Deskripsi'); if (!bl.ok) return bl
  return { ok: true }
}
