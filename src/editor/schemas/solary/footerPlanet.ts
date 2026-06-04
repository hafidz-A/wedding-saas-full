import type { SectionSchema } from '../types'

export const footerPlanetSchema: SectionSchema = {
  type: 'footerPlanet',
  label: { id: 'Penutup', en: 'Footer' },
  fields: [
    { key: 'heading',          label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',             label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 3 },
    { key: 'signature',        label: { id: 'Teks kredit bawah', en: 'Footer credit' }, type: 'text',
      help: { id: 'Baris kecil paling bawah. Kosongkan untuk menghilangkannya.', en: 'The small bottom line. Leave empty to hide it.' } },
    { key: 'easterEggMessage', label: { id: 'Pesan rahasia (klik matahari)', en: 'Easter egg message' }, type: 'textarea', rows: 2 },
    { key: 'photoFramesEnabled', label: { id: 'Tampilkan foto di belakang teks', en: 'Show photos behind text' }, type: 'boolean',
      help: { id: 'Frame foto miring (memakai foto Opening Gate) di belakang teks penutup.', en: 'Tilted photo frames (reusing the Opening Gate photos) behind the closing text.' } },
  ],
  defaults: {
    sectionLabel: 'End of Transmission',
    signature: 'Made with light. Galactic Wedding Engine v3.0.',
    photoFramesEnabled: true,
  },
}
