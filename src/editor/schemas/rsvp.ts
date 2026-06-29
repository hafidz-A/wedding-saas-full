import type { SectionSchema } from './types'

export const rsvpSchema: SectionSchema = {
  type: 'rsvp',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'title',    label: { id: 'Judul', en: 'Title' },       type: 'text' },
    { key: 'subtitle', label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    {
      key: 'mealEnabled',
      label: { id: 'Tampilkan pilihan menu', en: 'Show meal options' },
      help: {
        id: 'Mati secara default. Aktifkan kalau ingin tamu memilih menu makanan di form RSVP.',
        en: 'Off by default. Turn on if you want guests to pick a meal in the RSVP form.',
      },
      type: 'boolean',
    },
    {
      key: 'mealOptions',
      label: { id: 'Pilihan menu', en: 'Meal options' },
      help: {
        id: 'Hanya tampil bila "Tampilkan pilihan menu" diaktifkan.',
        en: 'Only shown when "Show meal options" is enabled.',
      },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { value: '', label: '' },
      itemFields: [
        { key: 'value', label: { id: 'Value (sistem)', en: 'Value (machine)' }, type: 'text' },
        { key: 'label', label: { id: 'Label (tampilan)', en: 'Label (display)' }, type: 'text' },
      ],
    },
  ],
  defaults: {
    title: 'Will You Join Us?',
    subtitle: 'Kindly respond by 1 November 2026',
    mealEnabled: false,
    mealOptions: [
      { value: 'beef',       label: 'Beef Tenderloin'   },
      { value: 'fish',       label: 'Pan-Seared Fish'   },
      { value: 'vegetarian', label: 'Garden Vegetarian' },
    ],
  },
}
