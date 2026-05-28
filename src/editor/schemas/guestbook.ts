import type { SectionSchema } from './types'

const COLORS = [
  { value: 'coral',  label: { id: 'Coral', en: 'Coral' } },
  { value: 'gold',   label: { id: 'Gold', en: 'Gold' } },
  { value: 'sky',    label: { id: 'Sky', en: 'Sky' } },
  { value: 'mint',   label: { id: 'Mint', en: 'Mint' } },
  { value: 'purple', label: { id: 'Purple', en: 'Purple' } },
]

export const guestbookSchema: SectionSchema = {
  type: 'guestbook',
  label: { id: 'Buku Tamu', en: 'Guestbook' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'initialNotes',
      label: { id: 'Ucapan awal', en: 'Seeded notes' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', message: '', color: 'gold' },
      itemFields: [
        { key: 'name',    label: { id: 'Nama', en: 'Name' },     type: 'text' },
        { key: 'message', label: { id: 'Pesan', en: 'Message' }, type: 'textarea', rows: 2 },
        { key: 'color',   label: { id: 'Warna', en: 'Color' },   type: 'select', options: COLORS },
      ],
    },
  ],
  defaults: {
    title: 'Leave a Note',
    subtitle: 'A digital guestbook of wishes from the people we love',
    initialNotes: [
      { id: 'n1', name: 'Maya',  message: 'So happy for you both — cannot wait for the big day!', color: 'gold' },
      { id: 'n2', name: 'Dimas', message: 'Brother, you found a gem. Cheers to forever.',         color: 'sky'  },
    ],
  },
}
