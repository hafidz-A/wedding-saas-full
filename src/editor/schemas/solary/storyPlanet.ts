import type { SectionSchema } from '../types'

export const storyPlanetSchema: SectionSchema = {
  type: 'storyPlanet',
  label: { id: 'Kisah Kami (Uranus)', en: 'Our Story (Uranus)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'timeline',
      label: { id: 'Linimasa', en: 'Timeline' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { year: '', label: '', desc: '', photos: [] },
      itemFields: [
        { key: 'year',   label: { id: 'Tahun', en: 'Year' }, type: 'text' },
        { key: 'label',  label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'desc',   label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 3 },
        { key: 'photos', label: { id: 'Foto', en: 'Photos' }, type: 'imageArray' },
      ],
    },
  ],
  defaults: {
    heading: 'A timeline written in starlight.',
    timeline: [
      { year: '2019', label: 'First Orbit', desc: "We crossed paths at a friend's birthday.", photos: [] },
      { year: '2025', label: 'The Proposal', desc: 'Under a meteor shower. She said yes.', photos: [] },
    ],
  },
}
