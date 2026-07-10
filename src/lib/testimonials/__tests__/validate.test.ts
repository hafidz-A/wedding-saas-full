import { describe, it, expect } from 'vitest'
import {
  countWords,
  validateReview,
  publicAuthorName,
  toPublicTestimonial,
  MAX_REVIEW_WORDS,
  ANON_LABEL,
} from '../validate'

describe('countWords', () => {
  it('is 0 for empty / whitespace', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
  it('collapses runs of whitespace', () => {
    expect(countWords('hello   world')).toBe(2)
    expect(countWords('  a b   c ')).toBe(3)
  })
})

describe('validateReview', () => {
  const base = { rating: 5, body: 'Undangannya bagus banget', authorName: 'Aria & Kirana', isAnonymous: false }

  it('rejects rating outside 1..5', () => {
    expect(validateReview({ ...base, rating: 0 }).ok).toBe(false)
    expect(validateReview({ ...base, rating: 6 }).ok).toBe(false)
    expect(validateReview({ ...base, rating: 2.5 }).ok).toBe(false)
  })
  it('rejects empty body', () => {
    expect(validateReview({ ...base, body: '   ' }).ok).toBe(false)
  })
  it(`rejects body over ${MAX_REVIEW_WORDS} words`, () => {
    const tooLong = Array.from({ length: MAX_REVIEW_WORDS + 1 }, () => 'kata').join(' ')
    expect(validateReview({ ...base, body: tooLong }).ok).toBe(false)
  })
  it('accepts a valid review and trims/normalizes', () => {
    const r = validateReview({ ...base, body: '  bagus sekali  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.body).toBe('bagus sekali')
      expect(r.value.rating).toBe(5)
      expect(r.value.isAnonymous).toBe(false)
    }
  })
  it('falls back to ANON_LABEL when author name is blank', () => {
    const r = validateReview({ ...base, authorName: '   ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.authorName).toBe(ANON_LABEL)
  })
})

describe('publicAuthorName', () => {
  it('masks anonymous reviewers', () => {
    expect(publicAuthorName({ authorName: 'Aria & Kirana', isAnonymous: true })).toBe(ANON_LABEL)
  })
  it('shows the name otherwise', () => {
    expect(publicAuthorName({ authorName: 'Aria & Kirana', isAnonymous: false })).toBe('Aria & Kirana')
  })
})

describe('toPublicTestimonial', () => {
  it('masks the author for anonymous rows', () => {
    const pub = toPublicTestimonial({
      id: 'x', rating: 5, body: 'keren', author_name: 'Aria & Kirana',
      is_anonymous: true, template_id: 'solary', is_visible: true, created_at: '2026-07-10',
    })
    expect(pub).toEqual({ id: 'x', rating: 5, body: 'keren', author: ANON_LABEL, templateId: 'solary' })
  })
})
