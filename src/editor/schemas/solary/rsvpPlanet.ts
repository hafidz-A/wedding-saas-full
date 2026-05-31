import type { SectionSchema } from '../types'

export const rsvpPlanetSchema: SectionSchema = {
  type: 'rsvpPlanet',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'heading',        label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'deadline',       label: { id: 'Batas waktu', en: 'Deadline' }, type: 'text' },
    { key: 'whatsappNumber', label: { id: 'Nomor WhatsApp', en: 'WhatsApp number' }, type: 'text' },
    { key: 'menuOptions',    label: { id: 'Pilihan menu', en: 'Menu options' }, type: 'stringArray', itemPlaceholder: 'e.g. Nusantara' },
  ],
  defaults: {
    sectionLabel: 'RSVP',
    heading: 'Please confirm your orbit by 31 January.',
    deadline: '2027-01-31',
    whatsappNumber: '+62 812-1234-5678',
    menuOptions: ['Nusantara', 'Mediterranean', 'Vegetarian'],
  },
}
