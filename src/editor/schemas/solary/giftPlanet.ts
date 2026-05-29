import type { SectionSchema } from '../types'

export const giftPlanetSchema: SectionSchema = {
  type: 'giftPlanet',
  label: { id: 'Hadiah & Ucapan (Mercury)', en: 'Gifts & Wishes (Mercury)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'accounts',
      label: { id: 'Rekening', en: 'Accounts' },
      type: 'objectArray',
      itemLabelKey: 'bank',
      newItem: { bank: '', number: '', name: '' },
      itemFields: [
        { key: 'bank',   label: { id: 'Bank', en: 'Bank' }, type: 'text' },
        { key: 'number', label: { id: 'No. rekening', en: 'Account number' }, type: 'text' },
        { key: 'name',   label: { id: 'Atas nama', en: 'Account name' }, type: 'text' },
      ],
    },
    { key: 'wishesEnabled', label: { id: 'Aktifkan ucapan', en: 'Enable wishes' }, type: 'boolean' },
  ],
  defaults: {
    heading: 'Your presence is the gift. But if you insist…',
    accounts: [{ bank: 'BCA', number: '1234567890', name: 'Aruna K.' }],
    wishesEnabled: true,
  },
}
