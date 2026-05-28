import type { SectionSchema } from './types'

export const accommodationsSchema: SectionSchema = {
  type: 'accommodations',
  label: { id: 'Akomodasi', en: 'Accommodations' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'hotels',
      label: { id: 'Hotel', en: 'Hotels' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', distance: '', description: '', price: '', phone: '', tag: '' },
      itemFields: [
        { key: 'name',        label: { id: 'Nama', en: 'Name' },          type: 'text' },
        { key: 'distance',    label: { id: 'Jarak', en: 'Distance' },     type: 'text' },
        { key: 'description', label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 2 },
        { key: 'price',       label: { id: 'Harga', en: 'Price' },        type: 'text' },
        { key: 'phone',       label: { id: 'Telepon', en: 'Phone' },      type: 'text' },
        { key: 'tag',         label: { id: 'Tag', en: 'Tag' },            type: 'text' },
      ],
    },
    {
      key: 'tips',
      label: { id: 'Tips perjalanan', en: 'Travel tips' },
      type: 'objectArray',
      itemLabelKey: 'text',
      newItem: { id: '', icon: '', text: '' },
      itemFields: [
        { key: 'icon', label: { id: 'Ikon', en: 'Icon' }, type: 'text' },
        { key: 'text', label: { id: 'Teks', en: 'Text' }, type: 'textarea', rows: 2 },
      ],
    },
  ],
  defaults: {
    title: 'Where to Stay',
    subtitle: 'A few favorites for our out-of-town guests',
    hotels: [
      { id: 'h1', name: 'Hotel Indonesia Kempinski', distance: '0.4 km', description: 'Five-star luxury directly across from the venue.',  price: 'From IDR 3.500.000 / night', phone: '+62 21 2358 3838', tag: 'Luxury'    },
      { id: 'h2', name: 'Pullman Jakarta Indonesia', distance: '1.1 km', description: 'Modern comfort with a beautiful rooftop pool.',     price: 'From IDR 2.100.000 / night', phone: '+62 21 3192 1111', tag: 'Mid-range' },
    ],
    tips: [
      { id: 't1', icon: 'plane', text: 'Soekarno-Hatta Intl. Airport (CGK) is about 45 minutes from the venue.' },
      { id: 't2', icon: 'car',   text: 'Grab and Gojek are reliable and inexpensive — keep the app installed.'  },
    ],
  },
}
