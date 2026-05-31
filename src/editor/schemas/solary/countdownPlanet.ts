import type { SectionSchema } from '../types'

export const countdownPlanetSchema: SectionSchema = {
  type: 'countdownPlanet',
  label: { id: 'Hitung Mundur', en: 'Countdown' },
  fields: [
    { key: 'heading',      label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'subheading',   label: { id: 'Subjudul', en: 'Subheading' }, type: 'text' },
    { key: 'targetDate',   label: { id: 'Tanggal acara', en: 'Target date' }, type: 'datetime' },
    { key: 'endDate',      label: { id: 'Tanggal selesai', en: 'End date' }, type: 'datetime' },
    { key: 'venueName',    label: { id: 'Nama tempat', en: 'Venue name' }, type: 'text' },
    { key: 'venueAddress', label: { id: 'Alamat tempat', en: 'Venue address' }, type: 'text' },
  ],
  defaults: {
    sectionLabel: 'Save the Date',
    heading: '02 · 14 · 2027',
    subheading: 'Sunday · 16:00 WIB · Garden Pavilion',
    targetDate: '2027-02-14T16:00:00+07:00',
    endDate: '2027-02-14T22:00:00+07:00',
    venueName: 'Plataran Menteng',
    venueAddress: 'Jl. HOS Cokroaminoto 42, Jakarta',
  },
}
