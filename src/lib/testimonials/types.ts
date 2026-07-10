/** What the client sends when submitting/editing a review. */
export interface ReviewInput {
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}

/** Validated + normalized review, safe to persist. */
export interface NormalizedReview {
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}

/** Raw DB row shape (subset used by the app). */
export interface TestimonialRow {
  id: string
  rating: number
  body: string
  author_name: string
  is_anonymous: boolean
  template_id: string
  is_visible: boolean
  created_at: string
}

/** Public-facing shape after masking, for the landing cards. */
export interface PublicTestimonial {
  id: string
  rating: number
  body: string
  author: string // already resolved: real name OR "Anonim"
  templateId: string
}
