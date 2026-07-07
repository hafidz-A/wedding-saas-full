// src/lib/templates/display.ts
// Client-safe template display shape + mappers. No DB / server imports here so it
// can be used from both the server fetch and client components (marketing card).

export interface TemplateDisplay {
  id: string
  enabled: boolean
  label: string
  category: string
  tags: string[]
  accent: string | null
  thumbnail: string | null
  sortOrder: number
  taglineId: string
  taglineEn: string
  blurbId: string
  blurbEn: string
}

/** Map a raw `templates` DB row (snake_case) to the client-safe display shape. */
export function toTemplateDisplay(row: any): TemplateDisplay {
  return {
    id: row.template_id,
    enabled: row.enabled !== false,
    label: row.label ?? row.template_id,
    category: row.category ?? 'wedding',
    tags: Array.isArray(row.tags) ? row.tags : [],
    accent: row.accent ?? null,
    thumbnail: row.thumbnail ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    taglineId: row.tagline_id ?? '',
    taglineEn: row.tagline_en ?? '',
    blurbId: row.blurb_id ?? '',
    blurbEn: row.blurb_en ?? '',
  }
}

/** Tagline + blurb for a language, each falling back to the other language. */
export function templateCopy(t: TemplateDisplay, lang: 'id' | 'en'): { tagline: string; blurb: string } {
  return lang === 'id'
    ? { tagline: t.taglineId || t.taglineEn, blurb: t.blurbId || t.blurbEn }
    : { tagline: t.taglineEn || t.taglineId, blurb: t.blurbEn || t.blurbId }
}
