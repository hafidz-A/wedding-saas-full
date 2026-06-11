import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const gallerySchema: SectionSchema = {
  type: 'gallery',
  label: { id: 'Galeri', en: 'Gallery' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'images',
      label: { id: 'Gambar', en: 'Images' },
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { id: '', src: '', caption: '', tall: false },
      itemFields: [
        { key: 'src',     label: { id: 'Gambar', en: 'Image' },        type: 'image' },
        { key: 'caption', label: { id: 'Keterangan', en: 'Caption' },  type: 'text' },
        { key: 'tall',    label: { id: 'Tinggi (2 baris)', en: 'Tall (2-row)' }, type: 'boolean' },
      ],
    },
  ],
  defaults: {
    title: 'Moments',
    subtitle: 'A small collection of our favorite memories',
    images: [
      { id: 'g1', src: demoImg('storyProposal', 900),   caption: 'The proposal',  tall: true  },
      { id: 'g2', src: demoImg('galleryRoadTrip', 900), caption: 'A road trip',   tall: false },
      { id: 'g3', src: demoImg('galleryBeach', 900),    caption: 'First holiday', tall: false },
      { id: 'g4', src: demoImg('galleryCoffee', 900),   caption: 'Lazy Sunday',   tall: true  },
    ],
  },
}
