import type { SectionSchema } from '../types'

export const openingGateSchema: SectionSchema = {
  type: 'openingGate',
  label: { id: 'Gerbang Pembuka', en: 'Opening Gate' },
  fields: [
    { key: 'eyebrow',    label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text' },
    { key: 'tagline',    label: { id: 'Tagline', en: 'Tagline' }, type: 'textarea', rows: 3 },
    { key: 'ctaLabel',   label: { id: 'Teks tombol', en: 'Button label' }, type: 'text' },
    { key: 'gatePhotos', label: { id: 'Foto bintang jatuh', en: 'Shooting photos' }, type: 'imageArray', maxItems: 12, help: { id: 'Foto yang melayang di gerbang pembuka', en: 'Photos drifting across the opening gate' } },
  ],
}
