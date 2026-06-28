import type { SectionSchema } from './types'

export const footerSchema: SectionSchema = {
  type: 'footer',
  label: { id: 'Footer', en: 'Footer' },
  fields: [
    { key: 'hashtag',    label: { id: 'Tagar', en: 'Hashtag' },         type: 'text' },
    { key: 'message',    label: { id: 'Pesan', en: 'Message' },         type: 'textarea', rows: 2 },
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text', linkedGroup: 'couple' },
    {
      key: 'socials',
      label: { id: 'Media sosial', en: 'Socials' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { id: '', label: '', url: '' },
      itemFields: [
        { key: 'label', label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'url',   label: { id: 'URL', en: 'URL' },     type: 'text' },
      ],
    },
  ],
  defaults: {
    monogram: 'A & H',
    hashtag: '#AureliaAndHadyan',
    message: 'Thank you for being part of our story.',
    coupleName: 'Aurelia & Hadyan',
    socials: [
      { id: 's-ig',   label: 'Instagram', url: '#' },
      { id: 's-mail', label: 'Email',     url: 'mailto:hello@example.com' },
    ],
  },
}
