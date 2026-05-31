import type { SectionSchema } from '../types'

export const teamPlanetSchema: SectionSchema = {
  type: 'teamPlanet',
  label: { id: 'Tim Pengiring (Venus)', en: 'Bridal Party (Venus)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'groups',
      label: { id: 'Grup', en: 'Groups' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { label: '', members: [] },
      itemFields: [
        { key: 'label', label: { id: 'Nama grup', en: 'Group label' }, type: 'text' },
        {
          key: 'members',
          label: { id: 'Anggota', en: 'Members' },
          type: 'objectArray',
          itemLabelKey: 'name',
          newItem: { name: '', role: '', avatar: '' },
          itemFields: [
            { key: 'name',   label: { id: 'Nama', en: 'Name' }, type: 'text' },
            { key: 'role',   label: { id: 'Peran', en: 'Role' }, type: 'text' },
            { key: 'avatar', label: { id: 'Foto', en: 'Avatar' }, type: 'image' },
          ],
        },
      ],
    },
  ],
  defaults: {
    sectionLabel: 'Bridal Party',
    heading: 'The constellation by our side.',
    groups: [
      { label: 'Bridesmaids', members: [{ name: 'Maya', role: 'Maid of Honor', avatar: '' }] },
      { label: 'Groomsmen',   members: [{ name: 'Rio',  role: 'Best Man',      avatar: '' }] },
    ],
  },
}
