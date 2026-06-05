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

  it('solary categories stay flat (no group)', () => {
    for (const cat of TUTORIAL_CATEGORIES_SOLARY) {
      expect(cat.group, `${cat.id} should have no group`).toBeUndefined()
    }
  })

  it('exposes four ordered groups', () => {
    expect(TUTORIAL_GROUPS).toEqual(['prep', 'fill', 'data', 'help'])
  })
})
