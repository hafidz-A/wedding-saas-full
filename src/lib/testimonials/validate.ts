import type { ReviewInput, NormalizedReview, TestimonialRow, PublicTestimonial } from './types'

export const MAX_REVIEW_WORDS = 400
export const MAX_REVIEW_CHARS = 4000 // DB safety net
export const ANON_LABEL = 'Anonim'

/** Word count that treats any run of whitespace as one separator. */
export function countWords(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export type ValidateResult =
  | { ok: true; value: NormalizedReview }
  | { ok: false; error: string }

/** Validate + normalize a submitted review. Pure — no I/O. */
export function validateReview(input: Partial<ReviewInput>): ValidateResult {
  const rating = Number(input.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Beri rating 1–5 bintang dulu.' }
  }
  const body = (input.body ?? '').trim()
  if (!body) return { ok: false, error: 'Isi ulasannya belum ditulis.' }
  if (body.length > MAX_REVIEW_CHARS) {
    return { ok: false, error: 'Ulasannya terlalu panjang.' }
  }
  if (countWords(body) > MAX_REVIEW_WORDS) {
    return { ok: false, error: `Ulasan maksimal ${MAX_REVIEW_WORDS} kata.` }
  }
  const isAnonymous = Boolean(input.isAnonymous)
  const authorName = (input.authorName ?? '').trim().slice(0, 120) || ANON_LABEL
  return { ok: true, value: { rating, body, authorName, isAnonymous } }
}

/** Public display name — masked when the couple chose anonymity. */
export function publicAuthorName(t: { authorName: string; isAnonymous: boolean }): string {
  return t.isAnonymous ? ANON_LABEL : (t.authorName?.trim() || ANON_LABEL)
}

/** Map a DB row to the masked public shape used by the landing cards. */
export function toPublicTestimonial(row: TestimonialRow): PublicTestimonial {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    author: publicAuthorName({ authorName: row.author_name, isAnonymous: row.is_anonymous }),
    templateId: row.template_id,
  }
}
