import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const ourStorySchema: SectionSchema = {
  type: 'ourStory',
  label: { id: 'Kisah Kami', en: 'Our Story' },
  fields: [
    { key: 'title', label: { id: 'Judul', en: 'Title' }, type: 'text' },
    {
      key: 'stories',
      label: { id: 'Kartu kisah', en: 'Story cards' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', year: '', date: '', title: '', description: '', image: '' },
      itemFields: [
        { key: 'year',        label: { id: 'Tahun', en: 'Year' },          type: 'text' },
        { key: 'date',        label: { id: 'Tanggal', en: 'Date' },        type: 'text' },
        { key: 'title',       label: { id: 'Judul', en: 'Title' },         type: 'text' },
        { key: 'description', label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 3 },
        { key: 'image',       label: { id: 'Gambar', en: 'Image' },        type: 'image' },
      ],
    },
  ],
  defaults: {
    title: 'Our Story',
    stories: [
      {
        id: 'story-1',
        year: '2020',
        date: '14 February 2020',
        title: 'The First Meeting',
        description: 'A quiet evening by the sea, where laughter became the language we both understood without saying a single word.',
        image: demoImg('storyFirstMeet', 1400),
      },
      {
        id: 'story-2',
        year: '2022',
        date: '15 December 2022',
        title: 'Our Holiday Together',
        description: 'Silly hats, shared snacks, and the kind of joy you only get when home is wherever the other person is.',
        image: demoImg('storyHoliday', 1400),
      },
      {
        id: 'story-3',
        year: '2024',
        date: '08 March 2024',
        title: 'The Proposal',
        description: 'A single quiet question on a slow Sunday — answered with tears, laughter, and a yes that has not stopped ringing since.',
        image: demoImg('storyProposal', 1400),
      },
    ],
  },
}
