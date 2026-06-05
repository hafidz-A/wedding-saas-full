import { describe, it, expect } from 'vitest'
import { dashboard } from '../dictionaries/dashboard'
import { TUTORIAL_CATEGORIES_SOLARY } from '@/app/[template]/[slug]/dashboard/tutorial/content'

const LANGS = ['id', 'en'] as const

function solaryCopy(lang: 'id' | 'en') {
  return (dashboard as any)[lang].tabs.tutorial.solary
}

function expectLen(arr: unknown, n: number, msg: string) {
  if (n === 0) return
  expect(Array.isArray(arr), `${msg} not array`).toBe(true)
  expect((arr as unknown[]).length, `${msg} length`).toBeGreaterThanOrEqual(n)
}

describe('solary tutorial copy integrity', () => {
  it('every solary category has copy matching its declared counts in both languages', () => {
    for (const lang of LANGS) {
      const sol = solaryCopy(lang)
      for (const cat of TUTORIAL_CATEGORIES_SOLARY) {
        const c = sol[cat.id]
        expect(c, `${lang} solary.${cat.id} missing`).toBeTruthy()
        expect(typeof c.title, `${lang} ${cat.id}.title`).toBe('string')
        expect(typeof c.summary, `${lang} ${cat.id}.summary`).toBe('string')
        expectLen(c.steps, cat.stepCount, `${lang} ${cat.id}.steps`)
        expectLen(c.always, cat.alwaysCount, `${lang} ${cat.id}.always`)
        expectLen(c.never, cat.neverCount, `${lang} ${cat.id}.never`)
        expectLen(c.tips, cat.tipCount, `${lang} ${cat.id}.tips`)
        if (cat.faqCount) {
          expectLen(c.faqs, cat.faqCount, `${lang} ${cat.id}.faqs`)
          for (const f of c.faqs) {
            expect(typeof f.q, `${lang} ${cat.id} faq.q`).toBe('string')
            expect(typeof f.a, `${lang} ${cat.id} faq.a`).toBe('string')
          }
        }
        if (cat.relatedTab) {
          expect(typeof c.openTab, `${lang} ${cat.id}.openTab`).toBe('string')
        }
        for (const shot of cat.shots) {
          expect(typeof c.shots?.[shot.captionKey], `${lang} ${cat.id} caption ${shot.captionKey}`).toBe('string')
        }
      }
    }
  })
})
