import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: { id: 'Coral', en: 'Coral' } },
  { value: 'emerald', label: { id: 'Emerald', en: 'Emerald' } },
  { value: 'gold',    label: { id: 'Gold', en: 'Gold' } },
  { value: 'sky',     label: { id: 'Sky', en: 'Sky' } },
  { value: 'purple',  label: { id: 'Purple', en: 'Purple' } },
]

export const eventDetailsSchema: SectionSchema = {
  type: 'eventDetails',
  label: { id: 'Detail Acara', en: 'Event Details' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'events',
      label: { id: 'Acara', en: 'Events' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { id: '', label: '', icon: '', date: '', time: '', location: '', accent: 'coral' },
      itemFields: [
        { key: 'label',    label: { id: 'Label', en: 'Label' },       type: 'text' },
        { key: 'icon',     label: { id: 'Ikon', en: 'Icon' },         type: 'text' },
        { key: 'date',     label: { id: 'Tanggal', en: 'Date' },      type: 'text' },
        { key: 'time',     label: { id: 'Waktu', en: 'Time' },        type: 'text' },
        { key: 'location', label: { id: 'Lokasi', en: 'Location' },   type: 'text' },
        { key: 'accent',   label: { id: 'Warna aksen', en: 'Accent' }, type: 'select', options: ACCENTS },
      ],
    },
    { key: 'mapEmbed', label: { id: 'URL embed peta', en: 'Map embed URL' }, type: 'textarea', rows: 3 },
  ],
  defaults: {
    title: 'Event Details',
    subtitle: 'Join us as we celebrate the beginning of forever',
    events: [
      { id: 'ceremony',  label: 'Ceremony',   icon: 'rings',     date: 'Saturday, 12 December 2026', time: '16:00 — 17:30', location: 'St. Mary Chapel, Jakarta', accent: 'coral' },
      { id: 'reception', label: 'Reception',  icon: 'champagne', date: 'Saturday, 12 December 2026', time: '19:00 — 23:00', location: 'The Grand Ballroom, Jakarta', accent: 'emerald' },
    ],
    mapEmbed: '',
  },
}
