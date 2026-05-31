import type { SectionSchema } from '../types'

export const footerPlanetSchema: SectionSchema = {
  type: 'footerPlanet',
  label: { id: 'Penutup', en: 'Footer' },
  fields: [
    { key: 'heading',          label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',             label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 3 },
    { key: 'easterEggMessage', label: { id: 'Pesan rahasia (klik matahari)', en: 'Easter egg message' }, type: 'textarea', rows: 2 },
  ],
  defaults: {
    sectionLabel: 'End of Transmission',
  },
}
