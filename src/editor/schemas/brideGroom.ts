import type { SectionSchema } from './types'

export const brideGroomSchema: SectionSchema = {
  type: 'brideGroom',
  label: { id: 'Mempelai', en: 'Bride & Groom' },
  fields: [
    { key: 'title', label: { id: 'Judul', en: 'Title' }, type: 'text' },
    {
      key: 'people',
      label: { id: 'Profil mempelai', en: 'People' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { role: '', name: '', photo: '', parents: '', bio: '', instagram: '', direction: 'right' },
      itemFields: [
        { key: 'role',      label: { id: 'Peran', en: 'Role' },        type: 'text' },
        { key: 'name',      label: { id: 'Nama', en: 'Name' },         type: 'text' },
        { key: 'photo',     label: { id: 'Foto', en: 'Photo' },        type: 'image' },
        { key: 'parents',   label: { id: 'Orang tua', en: 'Parents' }, type: 'text' },
        { key: 'bio',       label: { id: 'Bio', en: 'Bio' },           type: 'textarea', rows: 3 },
        { key: 'instagram', label: { id: 'Instagram', en: 'Instagram' }, type: 'text' },
        { key: 'direction', label: { id: 'Posisi gambar', en: 'Image side' }, type: 'select', options: [
          { value: 'left',  label: { id: 'Kiri', en: 'Left' } },
          { value: 'right', label: { id: 'Kanan', en: 'Right' } },
        ] },
      ],
    },
  ],
  defaults: {
    title: 'The Bride & Groom',
    people: [
      {
        role: 'Bride',
        name: 'Aurelia Sastrawijaya',
        photo: 'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=800&q=80',
        parents: 'Daughter of Mr. & Mrs. Sastrawijaya',
        bio: 'A daughter, a dreamer, a designer of warm spaces and warmer conversations.',
        instagram: '@aurelia.s',
        direction: 'right',
      },
      {
        role: 'Groom',
        name: 'Hadyan Pratama',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        parents: 'Son of Mr. & Mrs. Pratama',
        bio: 'A son, a builder, a believer in slow Sundays.',
        instagram: '@hadyan.p',
        direction: 'left',
      },
    ],
  },
}
