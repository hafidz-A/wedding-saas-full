import { describe, it, expect } from 'vitest'
import { validateTemplatePatch } from '../validate-template'

describe('validateTemplatePatch', () => {
  it('accepts a full valid patch', () => {
    expect(validateTemplatePatch({
      enabled: true, label: 'Lovebirds', category: 'wedding', tags: ['a'],
      accent: '#E8553E', thumbnail: '/x.jpg', sort_order: 0,
      tagline_id: 'Hangat', tagline_en: 'Warm', blurb_id: 'bi', blurb_en: 'be',
    }).ok).toBe(true)
  })
  it('rejects an unknown category', () => {
    const v = validateTemplatePatch({ category: 'nope' })
    expect(v.ok).toBe(false)
  })
  it('rejects a non-hex accent', () => {
    expect(validateTemplatePatch({ accent: 'red' }).ok).toBe(false)
    expect(validateTemplatePatch({ accent: '#fff' }).ok).toBe(true)
  })
  it('requires BOTH languages for tagline/blurb', () => {
    expect(validateTemplatePatch({ tagline_id: 'Hangat', tagline_en: '' }).ok).toBe(false)
    expect(validateTemplatePatch({ blurb_id: '', blurb_en: 'be' }).ok).toBe(false)
    expect(validateTemplatePatch({ tagline_id: 'Hangat', tagline_en: 'Warm' }).ok).toBe(true)
  })
  it('rejects an empty label + negative sort_order', () => {
    expect(validateTemplatePatch({ label: '  ' }).ok).toBe(false)
    expect(validateTemplatePatch({ sort_order: -1 }).ok).toBe(false)
  })
})
