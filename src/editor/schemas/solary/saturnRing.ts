import type { SectionSchema } from '../types'

export const saturnRingSchema: SectionSchema = {
  type: 'saturnRing',
  label: { id: 'Galeri', en: 'Gallery' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'photos',
      label: { id: 'Foto cincin', en: 'Ring photos' },
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { src: '', caption: '' },
      // The photo orbit grows with the count (galacticScene.setSaturnPhotos)
      // so up to 30 cards keep breathing room; 30 is also the GPU-texture
      // ceiling — every card holds its own large canvas texture.
      maxItems: 30,
      itemFields: [
        { key: 'src',     label: { id: 'Gambar', en: 'Image' }, type: 'image' },
        { key: 'caption', label: { id: 'Caption', en: 'Caption' }, type: 'text' },
      ],
    },
  ],
  defaults: {
    sectionLabel: 'Gallery',
  },
}
