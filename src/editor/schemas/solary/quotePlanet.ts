import type { SectionSchema } from '../types'

export const quotePlanetSchema: SectionSchema = {
  type: 'quotePlanet',
  label: { id: 'Kutipan / Ayat', en: 'Quote / Verse' },
  fields: [
    { key: 'heading',     label: { id: 'Judul (opsional)', en: 'Heading (optional)' }, type: 'text' },
    { key: 'verse',       label: { id: 'Ayat / kutipan', en: 'Verse / quote' }, type: 'textarea', rows: 4 },
    { key: 'translation', label: { id: 'Terjemahan (opsional)', en: 'Translation (optional)' }, type: 'textarea', rows: 3 },
    { key: 'source',      label: { id: 'Sumber', en: 'Source' }, type: 'text', help: { id: 'mis. QS Ar-Rum: 21', en: 'e.g. QS Ar-Rum: 21' } },
  ],
  defaults: {
    heading: '',
    verse: 'And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them.',
    translation: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
    source: 'QS Ar-Rum: 21',
  },
}
