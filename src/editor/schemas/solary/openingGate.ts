import type { SectionSchema } from '../types'

export const openingGateSchema: SectionSchema = {
  type: 'openingGate',
  label: { id: 'Gerbang Pembuka', en: 'Opening Gate' },
  fields: [
    { key: 'eyebrow',    label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text' },
    { key: 'tagline',    label: { id: 'Tagline', en: 'Tagline' }, type: 'textarea', rows: 3 },
    { key: 'ctaLabel',   label: { id: 'Teks tombol', en: 'Button label' }, type: 'text' },
  ],
}
