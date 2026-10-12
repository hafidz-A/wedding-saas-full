import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const footerSchema: SectionSchema = {
  type: 'footer',
  label: { id: 'Footer', en: 'Footer' },
  fields: [
    { key: 'hashtag',    label: { id: 'Tagar', en: 'Hashtag' },         type: 'text' },
    { key: 'message',    label: { id: 'Pesan', en: 'Message' },         type: 'textarea', rows: 2 },
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text', linkedGroup: 'couple' },
    {
      key: 'photos',
      label: { id: 'Foto pasangan', en: 'Couple photos' },
      type: 'objectArray',
      itemLabelKey: 'alt',
      newItem: { src: '', alt: '' },
      // Footer.jsx lays out exactly a left + right card and slices to 2.
      maxItems: 2,
      itemFields: [
        {
          key: 'src', label: { id: 'Foto', en: 'Photo' }, type: 'image',
          help: {
            id: 'Polaroid di atas tagar — foto 1 di kiri, foto 2 di kanan. Hapus keduanya untuk menyembunyikan.',
            en: 'Polaroid above the hashtag — photo 1 left, photo 2 right. Remove both to hide them.',
          },
        },
        { key: 'alt', label: { id: 'Keterangan', en: 'Caption' }, type: 'text' },
      ],
    },
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
    photos: [
      { src: demoImg('bridePortrait', 600), alt: 'Aurelia' },
      { src: demoImg('groomPortrait', 600), alt: 'Hadyan' },
    ],
    socials: [
      { id: 's-ig',   label: 'Instagram', url: '#' },
      { id: 's-mail', label: 'Email',     url: 'mailto:hello@example.com' },
    ],
  },
}
