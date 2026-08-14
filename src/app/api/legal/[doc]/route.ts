import { NextResponse } from 'next/server'
import { getLegalDoc } from '@/lib/legal/get'
import { formatRevised } from '@/lib/legal/format'
import { LEGAL_DOC_TYPES, type LegalDocType } from '@/lib/legal/defaults'
import type { Lang } from '@/lib/i18n/config'

interface Ctx {
  params: { doc: string }
}

/**
 * GET /api/legal/[doc]?lang=id|en
 *
 * Public content (no auth) — backs the signup consent modal
 * (LegalDocBody.tsx) so it can never drift from the published /privacy and
 * /refund pages. `doc` and `lang` are validated against the same enums the
 * public pages use; getLegalDoc() itself never throws.
 */
export async function GET(req: Request, { params }: Ctx) {
  const doc = params.doc as LegalDocType
  if (!LEGAL_DOC_TYPES.includes(doc)) {
    return NextResponse.json({ error: 'Unknown document' }, { status: 400 })
  }

  const url = new URL(req.url)
  const langParam = url.searchParams.get('lang')
  const lang: Lang = langParam === 'en' ? 'en' : 'id'

  const { html, revisedAt } = await getLegalDoc(doc, lang)

  return NextResponse.json({ html, updated: formatRevised(revisedAt, lang) })
}
