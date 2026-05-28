import type { SectionSchema } from './types'

export const faqSchema: SectionSchema = {
  type: 'faq',
  label: { id: 'Tanya Jawab', en: 'FAQ' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'items',
      label: { id: 'Pertanyaan', en: 'Questions' },
      type: 'objectArray',
      itemLabelKey: 'q',
      newItem: { id: '', q: '', a: '' },
      itemFields: [
        { key: 'q', label: { id: 'Pertanyaan', en: 'Question' }, type: 'text' },
        { key: 'a', label: { id: 'Jawaban', en: 'Answer' },      type: 'textarea', rows: 3 },
      ],
    },
  ],
  defaults: {
    title: 'Questions, Answered',
    subtitle: 'A few things our friends keep asking',
    items: [
      { id: 'f1', q: 'Can I bring a plus one?',              a: 'We are keeping the guest list intimate. If your invitation includes a plus one, it will be listed on the RSVP page.' },
      { id: 'f2', q: 'Is parking available at the venue?',   a: 'Yes — complimentary valet parking is provided for all guests on the evening of the wedding.' },
      { id: 'f3', q: 'What time should I arrive?',           a: 'We recommend arriving at 15:30 for welcome drinks. The ceremony begins at 16:00 sharp.' },
    ],
  },
}
