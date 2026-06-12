import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const galleryMasonrySchema: SectionSchema = {
  type: 'galleryMasonry',
  label: { id: 'Galeri (Masonry)', en: 'Gallery (Masonry)' },
  fields: [
    { type: 'text', key: 'eyebrow',         label: { id: 'Teks kecil atas', en: 'Eyebrow' }, help: { id: 'Teks kecil di atas judul', en: 'Small text above the title' } },
    { type: 'text', key: 'sectionTitle',    label: { id: 'Judul', en: 'Title' } },
    { type: 'text', key: 'sectionSubtitle', label: { id: 'Subjudul', en: 'Subtitle' } },
    {
      type: 'objectArray',
      key: 'photos',
      label: { id: 'Foto', en: 'Photos' },
      itemLabelKey: 'alt',
      newItem: { src: '', alt: '' },
      // The 5 belts animate on FIXED durations: more photos = taller belts =
      // visibly racing scroll. ~30 is the most before the motion looks wrong.
      // GalleryMasonry.jsx clamps to the same number at render.
      maxItems: 30,
      itemFields: [
        { type: 'image', key: 'src', label: { id: 'Foto', en: 'Photo' } },
        { type: 'text',  key: 'alt', label: { id: 'Keterangan', en: 'Caption' } },
      ],
    },
  ],
  defaults: {
    eyebrow: 'Our Moments',
    sectionTitle: 'Memories',
    sectionSubtitle: 'A small collection of our favorite memories together',
    photos: [
      { src: demoImg('storyProposal', 600),   alt: 'The proposal' },
      { src: demoImg('coupleCasual', 600),    alt: 'Just us' },
      { src: demoImg('galleryBirthday', 600), alt: 'Birthday surprise' },
      { src: demoImg('coupleClassic', 600),   alt: 'Our wedding' },
      { src: demoImg('gallerySunrise', 600),  alt: 'Lazy Sunday' },
      { src: demoImg('galleryRoadTrip', 600), alt: 'Road trip' },
      { src: demoImg('storyHoliday', 600),    alt: 'Holiday together' },
      { src: demoImg('galleryCoffee', 600),   alt: 'Coffee mornings' },
    ],
  },
}
