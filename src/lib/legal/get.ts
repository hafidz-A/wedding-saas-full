import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sanitizeLegalHtml } from './sanitize'
import { DEFAULT_LEGAL_HTML, DEFAULT_REVISED_ISO, type LegalDocType } from './defaults'
import type { Lang } from '@/lib/i18n/config'

export interface LegalDoc {
  html: string
  revisedAt: string
  source: 'db' | 'default'
}

/**
 * Reads a legal document for public rendering: `legal_documents` row wins
 * when present, the committed default in defaults.ts otherwise. DB HTML is
 * re-sanitized on read (defense-in-depth alongside the admin save path —
 * see sanitize.ts's header comment).
 *
 * NEVER throws. The migration creating `legal_documents` may not have been
 * applied yet (first real-world call fails with "relation ... does not
 * exist"), and a legal page can never blank or 500 because of that — every
 * error path quietly falls back to the default.
 */
export async function getLegalDoc(doc: LegalDocType, lang: Lang): Promise<LegalDoc> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await (supabase.from('legal_documents') as any)
      .select('content_html, revised_at')
      .eq('doc_type', doc)
      .eq('lang', lang)
      .maybeSingle()

    if (!error && data?.content_html) {
      return {
        html: sanitizeLegalHtml(String(data.content_html)),
        revisedAt: data.revised_at ? String(data.revised_at) : DEFAULT_REVISED_ISO,
        source: 'db',
      }
    }
  } catch (err) {
    console.error('[getLegalDoc] DB read failed, serving the committed default', err)
  }

  return {
    html: DEFAULT_LEGAL_HTML[doc][lang],
    revisedAt: DEFAULT_REVISED_ISO,
    source: 'default',
  }
}
