import { describe, it, expect } from 'vitest'
import { dashboard } from '../dictionaries/dashboard'
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_GROUPS,
} from '@/app/[template]/[slug]/dashboard/tutorial/content'

const LANGS = ['id', 'en'] as const

function tutorialFor(lang: 'id' | 'en') {
  return (dashboard as any)[lang].tabs.tutorial
}

function expectLen(arr: unknown, n: number, msg: string) {
  if (n === 0) return
  expect(Array.isArray(arr), `${msg} not array`).toBe(true)
  expect((arr as unknown[]).length, `${msg} length`).toBeGreaterThanOrEqual(n)
}

describe('lovebirds tutorial copy integrity', () => {
  it('group labels exist in both languages', () => {
    for (const lang of LANGS) {
      const t = tutorialFor(lang)
      for (const g of TUTORIAL_GROUPS) {
        expect(typeof t.groups?.[g], `${lang} groups.${g}`).toBe('string')
      }
    }
  })

  it('headings exist in both languages', () => {
    for (const lang of LANGS) {
      const h = tutorialFor(lang).headings
      for (const k of ['steps', 'always', 'never', 'tips', 'sees', 'fill', 'watch', 'faq']) {
        expect(typeof h?.[k], `${lang} headings.${k}`).toBe('string')
      }
    }
  })

  it('every category has copy matching its declared counts in both languages', () => {
    for (const lang of LANGS) {
      const t = tutorialFor(lang)
      for (const cat of TUTORIAL_CATEGORIES) {
        const c = t[cat.id]
        expect(c, `${lang} tutorial.${cat.id} missing`).toBeTruthy()
        expect(typeof c.title, `${lang} ${cat.id}.title`).toBe('string')
        expect(typeof c.summary, `${lang} ${cat.id}.summary`).toBe('string')
        expectLen(c.steps, cat.stepCount, `${lang} ${cat.id}.steps`)
        expectLen(c.always, cat.alwaysCount, `${lang} ${cat.id}.always`)
        expectLen(c.never, cat.neverCount, `${lang} ${cat.id}.never`)
        expectLen(c.tips, cat.tipCount, `${lang} ${cat.id}.tips`)

        if (cat.sectionGuideCount) {
          expectLen(c.sectionGuides, cat.sectionGuideCount, `${lang} ${cat.id}.sectionGuides`)
          for (const g of c.sectionGuides) {
            for (const k of ['title', 'sees', 'fill', 'watch']) {
              expect(typeof g[k], `${lang} ${cat.id} card.${k}`).toBe('string')
            }
          }
        }

        if (cat.faqCount) {
          expectLen(c.faqs, cat.faqCount, `${lang} ${cat.id}.faqs`)
          for (const f of c.faqs) {
            expect(typeof f.q, `${lang} ${cat.id} faq.q`).toBe('string')
            expect(typeof f.a, `${lang} ${cat.id} faq.a`).toBe('string')
          }
        }

        for (const shot of cat.shots) {
          expect(typeof c.shots?.[shot.captionKey], `${lang} ${cat.id} caption ${shot.captionKey}`).toBe('string')
        }
      }
    }
  })
})
