// src/app/admin/legal/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { sanitizeLegalHtml } from '@/lib/legal/sanitize'
import { LEGAL_DOC_TYPES, DEFAULT_LEGAL_HTML, type LegalDocType } from '@/lib/legal/defaults'
import { LANGS, type Lang } from '@/lib/i18n/config'

type Result = { ok: boolean; error?: string }

/** Legal text is compliance content, not a chat message — 500 KB is generous
 *  headroom over the committed defaults (~15-25 KB each) while still catching
 *  a pasted-in binary blob or a runaway editor bug. */
const MAX_CONTENT_BYTES = 500 * 1024

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

function isLegalDocType(v: unknown): v is LegalDocType {
  return typeof v === 'string' && (LEGAL_DOC_TYPES as readonly string[]).includes(v)
}
function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v)
}

/** Every place a legal doc save/reset can be read from — the three public
 *  pages, plus the editor itself so the status matrix reflects the change. */
function revalidateLegalPaths(): void {
  revalidatePath('/terms')
  revalidatePath('/privacy')
  revalidatePath('/refund')
  revalidatePath('/admin/legal')
}

export interface SaveLegalDocInput {
  docType: string
  lang: string
  contentHtml: string
  /** "Perbaikan kecil — jangan ubah tanggal": true skips the revised_at bump. */
  minorFix?: boolean
}

/**
 * Upsert an admin override for one (docType, lang) legal document.
 *
 * The date rule is the whole point of this action (design doc section A.2):
 * a normal save moves `revised_at` — the PUBLIC "Terakhir diperbarui" date —
 * to now, because the published content changed. A save with `minorFix: true`
 * (typo, phone number, formatting) must NOT advertise a policy revision that
 * didn't happen, so `revised_at` is left OUT of the write object entirely:
 *   - on an EXISTING row, Postgres/PostgREST leaves an omitted column
 *     untouched on upsert — the row keeps its previously-published date.
 *   - on a BRAND-NEW row, the column has no prior value to preserve, so it
 *     falls back to its `DEFAULT now()` — that's correct, not a bug.
 * `updated_at`/`updated_by` move on every save regardless, so the admin
 * status matrix can always show the real last-touch time even when the
 * public date didn't move.
 */
export async function saveLegalDoc(input: SaveLegalDocInput): Promise<Result> {
  const admin = await guard()
  if (!admin) return { ok: false, error: 'Akses ditolak' }

  if (!isLegalDocType(input.docType)) return { ok: false, error: 'Jenis dokumen tidak dikenal' }
  if (!isLang(input.lang)) return { ok: false, error: 'Bahasa tidak dikenal' }

  const raw = typeof input.contentHtml === 'string' ? input.contentHtml : ''
  if (!raw.trim()) return { ok: false, error: 'Konten tidak boleh kosong' }
  if (new TextEncoder().encode(raw).length > MAX_CONTENT_BYTES) {
    return { ok: false, error: 'Konten terlalu besar (maksimal 500 KB)' }
  }

  const contentHtml = sanitizeLegalHtml(raw)
  if (!contentHtml.trim()) return { ok: false, error: 'Konten tidak boleh kosong' }

  const minorFix = input.minorFix === true
  const db = createSupabaseAdminClient()

  const patch: Record<string, unknown> = {
    doc_type: input.docType,
    lang: input.lang,
    content_html: contentHtml,
    updated_at: new Date().toISOString(),
    updated_by: admin.email,
  }
  // Deliberately omitted, not set to a "no-op" value, when minorFix — see the
  // function doc comment for why that distinction matters on upsert.
  if (!minorFix) patch.revised_at = new Date().toISOString()

  const { error } = await (db.from('legal_documents') as any)
    .upsert(patch, { onConflict: 'doc_type,lang' })
  if (error) {
    console.error('[saveLegalDoc]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  await logAdminAction(admin.email, {
    action: 'legal.update',
    targetType: 'legal_document',
    targetId: `${input.docType}:${input.lang}`,
    meta: { doc: input.docType, lang: input.lang, minorFix },
  })
  revalidateLegalPaths()
  return { ok: true }
}

export interface ResetLegalDocInput {
  docType: string
  lang: string
}

/** Delete the override row so the committed default in defaults.ts renders
 *  again on the public page. Idempotent — deleting a row that's already
 *  absent (already default) still succeeds. */
export async function resetLegalDoc(input: ResetLegalDocInput): Promise<Result> {
  const admin = await guard()
  if (!admin) return { ok: false, error: 'Akses ditolak' }
  if (!isLegalDocType(input.docType)) return { ok: false, error: 'Jenis dokumen tidak dikenal' }
  if (!isLang(input.lang)) return { ok: false, error: 'Bahasa tidak dikenal' }

  const db = createSupabaseAdminClient()
  const { error } = await (db.from('legal_documents') as any)
    .delete()
    .eq('doc_type', input.docType)
    .eq('lang', input.lang)
  if (error) {
    console.error('[resetLegalDoc]', error)
    return { ok: false, error: 'Gagal mengembalikan ke bawaan. Coba lagi.' }
  }

  await logAdminAction(admin.email, {
    action: 'legal.reset',
    targetType: 'legal_document',
    targetId: `${input.docType}:${input.lang}`,
    meta: { doc: input.docType, lang: input.lang, minorFix: false },
  })
  revalidateLegalPaths()
  return { ok: true }
}

/** Committed default HTML for the "Muat konten bawaan" prefill button.
 *  requireAdmin-guarded like its siblings even though the content itself is
 *  already public (it's what unauthenticated visitors see on /terms etc.) —
 *  consistent posture for everything in this file. Empty string on any
 *  rejection/invalid input rather than throwing, since the editor treats an
 *  empty result as "couldn't load" and shows a toast. */
export async function getDefaultLegalHtml(docType: string, lang: string): Promise<string> {
  const admin = await guard()
  if (!admin) return ''
  if (!isLegalDocType(docType) || !isLang(lang)) return ''
  return DEFAULT_LEGAL_HTML[docType][lang]
}
