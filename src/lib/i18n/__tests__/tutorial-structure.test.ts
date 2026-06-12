import { describe, it, expect } from 'vitest'
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_CATEGORIES_SOLARY,
  TUTORIAL_GROUPS,
} from '@/app/[template]/[slug]/dashboard/tutorial/content'

describe('tutorial content structure', () => {
  it('every lovebirds category has a valid group', () => {
    for (const cat of TUTORIAL_CATEGORIES) {
      expect(cat.group, `${cat.id} missing group`).toBeTruthy()
      expect(TUTORIAL_GROUPS).toContain(cat.group)
    }
  })

  it('every solary category has a valid group (shared grouped architecture)', () => {
    for (const cat of TUTORIAL_CATEGORIES_SOLARY) {
      expect(cat.group, `${cat.id} missing group`).toBeTruthy()
      expect(TUTORIAL_GROUPS).toContain(cat.group)
    }
  })

  it('exposes four ordered groups', () => {
    expect(TUTORIAL_GROUPS).toEqual(['prep', 'fill', 'data', 'help'])
  })

  it('lovebirds exposes the 15 expected categories in order', () => {
    expect(TUTORIAL_CATEGORIES.map((c) => c.id)).toEqual([
      'start', 'checklist', 'experience', 'editor', 'sections', 'photos',
      'palette', 'ornament', 'music', 'rsvps', 'gifts', 'guests', 'guestbook',
      'billing', 'faq',
    ])
  })

  it('solary exposes the 14 expected categories in order (no ornament — solary has none)', () => {
    expect(TUTORIAL_CATEGORIES_SOLARY.map((c) => c.id)).toEqual([
      'quickstart', 'start', 'experience', 'editor', 'sections', 'photos',
      'palette', 'music', 'rsvps', 'gifts', 'guests', 'guestbook', 'billing', 'faq',
    ])
  })

  it('solary never gains an ornament category — the backdrop is its 3D scene', () => {
    expect(TUTORIAL_CATEGORIES_SOLARY.some((c) => c.id === 'ornament')).toBe(false)
  })

  it('both templates ship a per-section guide with 14 cards', () => {
    const lb = TUTORIAL_CATEGORIES.find((c) => c.id === 'sections')
    const so = TUTORIAL_CATEGORIES_SOLARY.find((c) => c.id === 'sections')
    expect(lb?.sectionGuideCount).toBe(14)
    expect(so?.sectionGuideCount).toBe(14)
  })

  it('only the expected solary categories have a relatedTab deep-link', () => {
    expect(TUTORIAL_CATEGORIES_SOLARY.filter((c) => c.relatedTab).map((c) => c.id)).toEqual([
      'quickstart', 'editor', 'sections', 'photos', 'palette', 'music',
      'rsvps', 'gifts', 'guests', 'guestbook',
    ])
  })

  it('lovebirds categories never set relatedTab (frozen)', () => {
    for (const cat of TUTORIAL_CATEGORIES) {
      expect(cat.relatedTab, `${cat.id} should have no relatedTab`).toBeUndefined()
    }
  })
})
