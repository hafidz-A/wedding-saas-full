import { describe, it, expect } from 'vitest'
import { dashboard } from '../dictionaries/dashboard'
import {
  TUTORIAL_CATEGORIES_TAMAN_BUNGA,
  TAMAN_BUNGA_COPY_IDS,
  getTutorialCategories,
  tutorialCopyKey,
} from '@/app/[template]/[slug]/dashboard/tutorial/content'

const LANGS = ['id', 'en'] as const

function expectLen(arr: unknown, n: number, msg: string) {
  if (n === 0) return
  expect(Array.isArray(arr), `${msg} not array`).toBe(true)
  expect((arr as unknown[]).length, `${msg} length`).toBeGreaterThanOrEqual(n)
}

describe('taman-bunga tutorial copy integrity', () => {
  it('drops the ornament category and is what the template resolves to', () => {
    expect(getTutorialCategories('taman-bunga')).toBe(TUTORIAL_CATEGORIES_TAMAN_BUNGA)
    expect(TUTORIAL_CATEGORIES_TAMAN_BUNGA.map((c) => c.id)).not.toContain('ornament')
    expect(tutorialCopyKey('taman-bunga')).toBe('tamanBunga')
  })

  it('every category has copy (merged over lovebirds) matching its declared counts', () => {
    for (const lang of LANGS) {
      const root = (dashboard as any)[lang].tabs.tutorial
      const t = { ...root, ...root.tamanBunga }
      for (const cat of TUTORIAL_CATEGORIES_TAMAN_BUNGA) {
        const c = t[cat.id]
        expect(c, `${lang} ${cat.id} missing`).toBeTruthy()
        expect(typeof c.title, `${lang} ${cat.id}.title`).toBe('string')
        expect(typeof c.summary, `${lang} ${cat.id}.summary`).toBe('string')
        expectLen(c.steps, cat.stepCount, `${lang} ${cat.id}.steps`)
        expectLen(c.always, cat.alwaysCount, `${lang} ${cat.id}.always`)
        expectLen(c.never, cat.neverCount, `${lang} ${cat.id}.never`)
        expectLen(c.tips, cat.tipCount, `${lang} ${cat.id}.tips`)
        if (cat.sectionGuideCount) expectLen(c.sectionGuides, cat.sectionGuideCount, `${lang} ${cat.id}.sectionGuides`)
        if (cat.faqCount) expectLen(c.faqs, cat.faqCount, `${lang} ${cat.id}.faqs`)
        if (cat.relatedTab) expect(typeof c.openTab, `${lang} ${cat.id}.openTab`).toBe('string')
        for (const shot of cat.shots) {
          expect(typeof c.shots?.[shot.captionKey], `${lang} ${cat.id} caption ${shot.captionKey}`).toBe('string')
        }
      }
    }
  })

  it('every re-authored category exists under tutorial.tamanBunga', () => {
    for (const lang of LANGS) {
      const tb = (dashboard as any)[lang].tabs.tutorial.tamanBunga
      for (const id of TAMAN_BUNGA_COPY_IDS) expect(tb[id], `${lang} tamanBunga.${id}`).toBeTruthy()
    }
  })
})
