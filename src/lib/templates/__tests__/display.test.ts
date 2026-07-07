import { describe, it, expect } from 'vitest'
import { toTemplateDisplay, templateCopy } from '../display'

describe('toTemplateDisplay', () => {
  it('maps a DB row and defaults missing fields', () => {
    const d = toTemplateDisplay({
      template_id: 'lovebirds', enabled: true, label: 'Lovebirds', category: 'wedding',
      tags: ['a', 'b'], accent: '#E8553E', thumbnail: '/x.jpg', sort_order: 2,
      tagline_id: 'Hangat', tagline_en: 'Warm', blurb_id: 'bi', blurb_en: 'be',
    })
    expect(d).toMatchObject({ id: 'lovebirds', enabled: true, label: 'Lovebirds', sortOrder: 2, taglineEn: 'Warm' })
  })
  it('enabled defaults true only when not explicitly false', () => {
    expect(toTemplateDisplay({ template_id: 't', enabled: false }).enabled).toBe(false)
    expect(toTemplateDisplay({ template_id: 't' }).enabled).toBe(true)
  })
})

describe('templateCopy', () => {
  const base = toTemplateDisplay({ template_id: 't', tagline_id: 'IDt', tagline_en: 'ENt', blurb_id: 'IDb', blurb_en: 'ENb' })
  it('picks the language', () => {
    expect(templateCopy(base, 'id')).toEqual({ tagline: 'IDt', blurb: 'IDb' })
    expect(templateCopy(base, 'en')).toEqual({ tagline: 'ENt', blurb: 'ENb' })
  })
  it('falls back to the other language when one is empty', () => {
    const d = toTemplateDisplay({ template_id: 't', tagline_id: '', tagline_en: 'ENt', blurb_id: 'IDb', blurb_en: '' })
    expect(templateCopy(d, 'id').tagline).toBe('ENt') // id empty -> en
    expect(templateCopy(d, 'en').blurb).toBe('IDb')   // en empty -> id
  })
})
