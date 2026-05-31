import type { SectionSchema } from '../types'

const ICONS = [
  { value: 'pin',     label: { id: 'Pin', en: 'Pin' } },
  { value: 'clock',   label: { id: 'Jam', en: 'Clock' } },
  { value: 'sparkle', label: { id: 'Sparkle', en: 'Sparkle' } },
  { value: 'car',     label: { id: 'Mobil', en: 'Car' } },
]

export const detailsPlanetSchema: SectionSchema = {
  type: 'detailsPlanet',
  label: { id: 'Detail Acara (Mars)', en: 'Details (Mars)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'cards',
      label: { id: 'Kartu detail', en: 'Detail cards' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { icon: 'pin', label: '', primary: '', secondary: '', actionLabel: '', actionHref: '' },
      itemFields: [
        { key: 'icon',        label: { id: 'Ikon', en: 'Icon' }, type: 'select', options: ICONS },
        { key: 'label',       label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'primary',     label: { id: 'Teks utama', en: 'Primary' }, type: 'text' },
        { key: 'secondary',   label: { id: 'Teks kedua', en: 'Secondary' }, type: 'text' },
        { key: 'actionLabel', label: { id: 'Teks tombol', en: 'Action label' }, type: 'text' },
        { key: 'actionHref',  label: { id: 'Link tombol', en: 'Action link' }, type: 'text' },
      ],
    },
    { key: 'quote',            label: { id: 'Kutipan', en: 'Quote' }, type: 'textarea', rows: 2 },
    { key: 'quoteAttribution', label: { id: 'Sumber kutipan', en: 'Quote attribution' }, type: 'text' },
  ],
  defaults: {
    sectionLabel: 'The Details',
    heading: 'Where, when, and what to wear.',
    cards: [
      { icon: 'pin', label: 'Venue', primary: 'Plataran Menteng', secondary: 'Jakarta', actionLabel: 'Open Map', actionHref: '#' },
      { icon: 'clock', label: 'Time', primary: '16:00 — 22:00 WIB', secondary: 'Doors open 15:30', actionLabel: '', actionHref: '' },
    ],
    quote: 'Wear what makes you feel like a constellation.',
    quoteAttribution: 'Dress code note from the couple',
  },
}
