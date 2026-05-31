import type { SectionSchema } from '../types'

const PLATFORMS = [
  { value: 'youtube',   label: { id: 'YouTube', en: 'YouTube' } },
  { value: 'instagram', label: { id: 'Instagram', en: 'Instagram' } },
  { value: 'zoom',      label: { id: 'Zoom', en: 'Zoom' } },
  { value: 'other',     label: { id: 'Lainnya', en: 'Other' } },
]

export const liveStreamPlanetSchema: SectionSchema = {
  type: 'liveStreamPlanet',
  label: { id: 'Live Streaming', en: 'Live Streaming' },
  fields: [
    { key: 'heading',     label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'platform',    label: { id: 'Platform', en: 'Platform' }, type: 'select', options: PLATFORMS },
    { key: 'url',         label: { id: 'Link siaran', en: 'Stream link' }, type: 'text' },
    { key: 'scheduledAt', label: { id: 'Jadwal tayang', en: 'Scheduled time' }, type: 'text' },
    { key: 'note',        label: { id: 'Catatan (opsional)', en: 'Note (optional)' }, type: 'textarea', rows: 2 },
  ],
  defaults: {
    sectionLabel: 'Live Stream',
    heading: 'Saksikan Langsung',
    platform: 'youtube',
    url: 'https://youtube.com/live/your-stream',
    scheduledAt: 'Minggu, 14 Feb 2027 · 16:00 WIB',
    note: 'Bagi yang berhalangan hadir, ikuti acara kami secara langsung.',
  },
}
