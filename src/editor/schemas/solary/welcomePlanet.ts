import type { SectionSchema } from '../types'

export const welcomePlanetSchema: SectionSchema = {
  type: 'welcomePlanet',
  label: { id: 'Sambutan (Neptune)', en: 'Welcome (Neptune)' },
  fields: [
    { key: 'heading',         label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',            label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 4 },
    { key: 'portrait',        label: { id: 'Foto potret', en: 'Portrait' }, type: 'image' },
    { key: 'portraitCaption', label: { id: 'Caption foto', en: 'Portrait caption' }, type: 'text' },
  ],
  defaults: {
    sectionLabel: 'Welcome',
    heading: 'We found each other in the deep blue.',
    body: 'A short prelude before the journey: who we are, where we met, and the gravity that pulled us together.',
    portrait: 'https://picsum.photos/seed/welcome-portrait/800/1000',
    portraitCaption: 'Bali, 2023',
  },
}
