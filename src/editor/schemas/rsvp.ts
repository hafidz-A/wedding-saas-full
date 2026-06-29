import type { SectionSchema } from './types'

export const rsvpSchema: SectionSchema = {
  type: 'rsvp',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
  ],
  defaults: {
    title: 'Will You Join Us?',
    subtitle: 'Kindly respond by 1 November 2026',
  },
}
