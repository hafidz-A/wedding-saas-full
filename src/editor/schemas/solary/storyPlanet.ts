import type { SectionSchema } from '../types'

export const storyPlanetSchema: SectionSchema = {
  type: 'storyPlanet',
  label: { id: 'Kisah Kami', en: 'Our Story' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'timeline',
      label: { id: 'Linimasa', en: 'Timeline' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { year: '', label: '', desc: '', photo: '' },
      // Each chapter drives one "page" of the pinned rail / mobile card. ONE
      // photo per chapter (the stacked-photo carousel was removed); the rail
      // stays readable up to ~8 chapters.
      maxItems: 8,
      itemFields: [
        { key: 'year',  label: { id: 'Tahun', en: 'Year' }, type: 'text' },
        { key: 'label', label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'desc',  label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 3 },
        { key: 'photo', label: { id: 'Foto', en: 'Photo' }, type: 'image' },
      ],
    },
  ],
  defaults: {
    sectionLabel: 'Our Story',
    heading: 'A timeline written in starlight.',
    timeline: [
      { year: '2019', label: 'First Orbit', desc: "We crossed paths at a friend's birthday.", photo: '' },
      { year: '2025', label: 'The Proposal', desc: 'Under a meteor shower. She said yes.', photo: '' },
    ],
  },
}
