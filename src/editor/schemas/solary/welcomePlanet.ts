import type { SectionSchema } from '../types'
import { solaryImg as demoImg } from '@/all-templates/solary/demoImages'

export const welcomePlanetSchema: SectionSchema = {
  type: 'welcomePlanet',
  label: { id: 'Sambutan', en: 'Welcome' },
  fields: [
    { key: 'heading',         label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',            label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 4 },
    { key: 'portrait',        label: { id: 'Foto potret', en: 'Portrait' }, type: 'image' },
    { key: 'portraitCaption', label: { id: 'Caption foto', en: 'Portrait caption' }, type: 'text' },
    { key: 'layout', label: { id: 'Tata letak foto', en: 'Photo layout' }, type: 'select',
      options: [
        { value: 'single', label: { id: '1 foto (tengah)', en: '1 photo (center)' } },
        { value: 'duo',    label: { id: '2 foto (kiri & kanan)', en: '2 photos (left & right)' } },
      ] },
    { key: 'portrait2',        label: { id: 'Foto kedua', en: 'Second photo' }, type: 'image',
      help: { id: 'Dipakai bila tata letak "2 foto"', en: 'Used when layout is "2 photos"' } },
    { key: 'portraitCaption2', label: { id: 'Keterangan foto kedua', en: 'Second photo caption' }, type: 'text' },
  ],
  defaults: {
    sectionLabel: 'Welcome',
    heading: 'We found each other in the deep blue.',
    body: 'A short prelude before the journey: who we are, where we met, and the gravity that pulled us together.',
    portrait: demoImg('coupleClassic', 1000),
    portraitCaption: 'Bali, 2023',
  },
}
