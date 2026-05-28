import type { SectionSchema } from './types'

export const rsvpSchema: SectionSchema = {
  type: 'rsvp',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'mealOptions',
      label: { id: 'Pilihan menu', en: 'Meal options' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { value: '', label: '' },
      itemFields: [
        { key: 'value', label: { id: 'Value (sistem)', en: 'Value (machine)' }, type: 'text' },
        { key: 'label', label: { id: 'Label (tampilan)', en: 'Label (display)' }, type: 'text' },
      ],
    },
    { key: 'maxGuests', label: { id: 'Maks tamu per RSVP', en: 'Max guests per RSVP' }, type: 'text' },
  ],
  defaults: {
    title: 'Will You Join Us?',
    subtitle: 'Kindly respond by 1 November 2026',
    mealOptions: [
      { value: 'beef',       label: 'Beef Tenderloin'   },
      { value: 'fish',       label: 'Pan-Seared Fish'   },
      { value: 'vegetarian', label: 'Garden Vegetarian' },
    ],
    maxGuests: '5',
  },
}
