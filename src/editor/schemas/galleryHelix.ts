import type { SectionSchema } from './types'

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
      { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80', caption: 'The proposal'  },
      { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80', caption: 'A road trip'   },
      { src: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=80', caption: 'First holiday' },
      { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80', caption: 'Lazy Sunday'   },
    ],
  },
}
