import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const galleryHelixSchema: SectionSchema = {
  type: 'galleryHelix',
  label: { id: 'Galeri (Helix)', en: 'Gallery (Helix)' },
  fields: [
    { key: 'sectionTitle',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'sectionSubtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'photos',
      label: { id: 'Foto', en: 'Photos' },
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { src: '', caption: '' },
      itemFields: [
        { key: 'src',     label: { id: 'Gambar', en: 'Image' },       type: 'image' },
        { key: 'caption', label: { id: 'Keterangan', en: 'Caption' }, type: 'text' },
      ],
    },
  ],
  defaults: {
    sectionTitle: 'Moments',
    sectionSubtitle: 'A small collection of our favorite memories',
    photos: [
      { src: demoImg('storyProposal', 900),   caption: 'The proposal'  },
      { src: demoImg('galleryRoadTrip', 900), caption: 'A road trip'   },
      { src: demoImg('galleryBeach', 900),    caption: 'First holiday' },
      { src: demoImg('galleryCoffee', 900),   caption: 'Lazy Sunday'   },
    ],
  },
}
