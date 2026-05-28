import type { SectionSchema } from './types'

export const weddingPartySchema: SectionSchema = {
  type: 'weddingParty',
  label: { id: 'Pendamping Mempelai', en: 'Wedding Party' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'people',
      label: { id: 'Anggota', en: 'People' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', role: '', photo: '' },
      itemFields: [
        { key: 'name',  label: { id: 'Nama', en: 'Name' },   type: 'text' },
        { key: 'role',  label: { id: 'Peran', en: 'Role' },  type: 'text' },
        { key: 'photo', label: { id: 'Foto', en: 'Photo' },  type: 'image' },
      ],
    },
  ],
  defaults: {
    title: 'Wedding Party',
    subtitle: 'The people who make our story brighter',
    people: [
      { id: 'p1', name: 'Maya Larasati', role: 'Maid of Honor', photo: '' },
      { id: 'p2', name: 'Dimas Aji',     role: 'Best Man',      photo: '' },
    ],
  },
}
