import type { SectionSchema } from '../types'

export const rsvpPlanetSchema: SectionSchema = {
  type: 'rsvpPlanet',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'heading',        label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'deadline',       label: { id: 'Batas waktu', en: 'Deadline' }, type: 'text' },
    {
      key: 'whatsappNumber',
      label: { id: 'Nomor WhatsApp Anda', en: 'Your WhatsApp number' },
      type: 'text',
      help: {
        id: 'Nomor ini menjadi tombol "Konfirmasi via WhatsApp" di bagian RSVP — tamu bisa konfirmasi manual ke kamu setelah mengisi. Kosongkan kalau tidak ingin menampilkannya.',
        en: 'This number becomes a "Confirm via WhatsApp" button in the RSVP section — guests can confirm manually with you after submitting. Leave empty to hide it.',
      },
    },
  ],
  defaults: {
    sectionLabel: 'RSVP',
    heading: 'Please confirm your orbit by 31 January.',
    deadline: '2027-01-31',
    whatsappNumber: '+62 812-1234-5678',
  },
}
