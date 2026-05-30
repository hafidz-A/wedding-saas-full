import type { SectionSchema } from '../types'

export const faqPlanetSchema: SectionSchema = {
  type: 'faqPlanet',
  label: { id: 'FAQ', en: 'FAQ' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'items',
      label: { id: 'Pertanyaan', en: 'Questions' },
      type: 'objectArray',
      itemLabelKey: 'q',
      newItem: { q: '', a: '' },
      itemFields: [
        { key: 'q', label: { id: 'Pertanyaan', en: 'Question' }, type: 'text' },
        { key: 'a', label: { id: 'Jawaban', en: 'Answer' }, type: 'textarea', rows: 3 },
      ],
    },
  ],
  defaults: {
    heading: 'Pertanyaan Umum',
    items: [
      { q: 'Apakah boleh membawa anak?', a: 'Tentu, kami menyambut keluarga Anda.' },
      { q: 'Apa dress code-nya?', a: 'Formal dengan nuansa warna gelap metalik.' },
      { q: 'Apakah tersedia parkir?', a: 'Ya, valet parking tersedia untuk tamu.' },
    ],
  },
}
