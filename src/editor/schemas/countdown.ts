import type { SectionSchema } from './types'

export const countdownSchema: SectionSchema = {
  type: 'countdown',
  label: { id: 'Hitung Mundur', en: 'Countdown' },
  fields: [
    { key: 'weddingDate',   label: { id: 'Tanggal pernikahan', en: 'Wedding date' },   type: 'datetime' },
    { key: 'eyebrow',       label: { id: 'Teks kecil atas', en: 'Eyebrow' },           type: 'text' },
    { key: 'title',         label: { id: 'Judul', en: 'Title' },                        type: 'text' },
    { key: 'subtitle',      label: { id: 'Subjudul', en: 'Subtitle' },                  type: 'text' },
    { key: 'messageDuring', label: { id: 'Pesan (hari-H)', en: 'Message (on the day)' },    type: 'textarea', rows: 2 },
    { key: 'messageAfter',  label: { id: 'Pesan (setelah hari-H)', en: 'Message (after the day)' }, type: 'textarea', rows: 2 },
    {
      key: 'style',
      label: { id: 'Gaya', en: 'Style' },
      type: 'select',
      options: [
        { value: 'card',   label: { id: 'Kartu per unit (default)', en: 'Card per unit (default)' } },
        { value: 'mono',   label: { id: 'Monospace sebaris', en: 'Monospace inline' } },
        { value: 'italic', label: { id: 'Serif miring', en: 'Italic serif' } },
      ],
    },
    // Note: `labels` (Hari/Jam/Menit/Detik) is a nested object — current schema
    // framework supports only flat / array fields. Keep the default labels; if
    // a couple needs different unit names they can edit `props.labels.*` via
    // Supabase Table Editor directly.
  ],
  defaults: {
    weddingDate: '2026-12-12T16:00:00+07:00',
    eyebrow: 'Save the date',
    title: 'Menuju Hari Bahagia',
    subtitle: 'Hitung mundur sampai janji suci diucapkan',
    messageDuring: 'Hari ini, kami menikah!',
    messageAfter: 'Terima kasih telah menjadi bagian dari kisah kami.',
    style: 'card',
  },
}
