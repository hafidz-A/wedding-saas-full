import type { SectionSchema } from './types'

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
      { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80', alt: 'The proposal' },
      { src: 'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=600&q=80', alt: 'Just us' },
      { src: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=600&q=80', alt: 'Birthday surprise' },
      { src: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80', alt: 'Our wedding' },
      { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80', alt: 'Lazy Sunday' },
      { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80', alt: 'Road trip' },
      { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80', alt: 'Holiday together' },
      { src: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=600&q=80', alt: 'Coffee mornings' },
    ],
  },
}
