import type { SectionSchema } from './types'

export const quoteSchema: SectionSchema = {
  type: 'quote',
  label: { id: 'Kutipan / Ayat', en: 'Quote / Verse' },
  fields: [
    { key: 'text', label: { id: 'Teks kutipan', en: 'Quote text' }, type: 'textarea', rows: 4 },
    {
      key: 'attribution',
      label: { id: 'Sumber', en: 'Attribution' },
      type: 'text',
      help: { id: 'mis. QS Ar-Rum: 21', en: 'e.g. QS Ar-Rum: 21' },
    },
  ],
  defaults: {
    text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
    attribution: 'QS Ar-Rum: 21',
  },
}
