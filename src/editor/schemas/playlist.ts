import type { SectionSchema } from './types'

export const playlistSchema: SectionSchema = {
  type: 'playlist',
  label: { id: 'Playlist', en: 'Playlist' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'initialSongs',
      label: { id: 'Lagu awal', en: 'Seeded songs' },
      type: 'objectArray',
      itemLabelKey: 'song',
      newItem: { id: '', song: '', artist: '' },
      itemFields: [
        { key: 'song',   label: { id: 'Lagu', en: 'Song' },    type: 'text' },
        { key: 'artist', label: { id: 'Artis', en: 'Artist' }, type: 'text' },
      ],
    },
  ],
  defaults: {
    title: 'Build the Playlist',
    subtitle: 'What song would get you on the dance floor?',
    initialSongs: [
      { id: 'pl1', song: 'Perfect',   artist: 'Ed Sheeran'         },
      { id: 'pl2', song: 'September', artist: 'Earth, Wind & Fire' },
    ],
  },
}
