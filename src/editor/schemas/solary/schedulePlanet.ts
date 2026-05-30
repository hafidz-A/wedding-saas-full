import type { SectionSchema } from '../types'

export const schedulePlanetSchema: SectionSchema = {
  type: 'schedulePlanet',
  label: { id: 'Rundown Acara', en: 'Schedule' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'events',
      label: { id: 'Acara', en: 'Events' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { time: '', title: '', desc: '' },
      itemFields: [
        { key: 'time',  label: { id: 'Waktu', en: 'Time' }, type: 'text' },
        { key: 'title', label: { id: 'Acara', en: 'Title' }, type: 'text' },
        { key: 'desc',  label: { id: 'Keterangan', en: 'Description' }, type: 'textarea', rows: 2 },
      ],
    },
  ],
  defaults: {
    heading: 'Rundown Acara',
    events: [
      { time: '08:00', title: 'Akad Nikah', desc: 'Pemberkatan di ballroom utama.' },
      { time: '11:00', title: 'Resepsi', desc: 'Ramah tamah & santap siang.' },
      { time: '19:00', title: 'Dinner Reception', desc: 'Hiburan & potong kue.' },
    ],
  },
}
