import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: { id: 'Coral', en: 'Coral' } },
  { value: 'emerald', label: { id: 'Emerald', en: 'Emerald' } },
  { value: 'gold',    label: { id: 'Gold', en: 'Gold' } },
  { value: 'sky',     label: { id: 'Sky', en: 'Sky' } },
  { value: 'purple',  label: { id: 'Purple', en: 'Purple' } },
]

export const scheduleSchema: SectionSchema = {
  type: 'schedule',
  label: { id: 'Rangkaian Acara', en: 'Schedule' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'events',
      label: { id: 'Item acara', en: 'Schedule items' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', time: '', title: '', description: '', accent: 'coral', icon: '' },
      itemFields: [
        { key: 'time',        label: { id: 'Waktu', en: 'Time' },        type: 'text' },
        { key: 'title',       label: { id: 'Judul', en: 'Title' },       type: 'text' },
        { key: 'description', label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 2 },
        { key: 'accent',      label: { id: 'Warna aksen', en: 'Accent' }, type: 'select', options: ACCENTS },
        { key: 'icon',        label: { id: 'Ikon', en: 'Icon' },         type: 'text' },
      ],
    },
  ],
  defaults: {
    title: 'Schedule of the Day',
    subtitle: 'A gentle guide so you never miss a moment',
    events: [
      { id: 's1', time: '15:30', title: 'Guest Arrival',       description: 'Welcome drinks and live acoustic music on the terrace.',        accent: 'coral',   icon: 'door'  },
      { id: 's2', time: '16:00', title: 'Ceremony',            description: 'The exchange of vows beneath an arch of fresh flowers.',         accent: 'emerald', icon: 'rings' },
      { id: 's3', time: '19:00', title: 'Dinner Reception',    description: 'A four-course meal followed by speeches and toasts.',            accent: 'purple',  icon: 'plate' },
      { id: 's4', time: '21:00', title: 'First Dance & Party', description: 'Music, dancing, and dessert until the late hour.',               accent: 'coral',   icon: 'music' },
    ],
  },
}
