import type { SectionSchema } from '../types'

export const giftPlanetSchema: SectionSchema = {
  type: 'giftPlanet',
  label: { id: 'Hadiah (Mercury)', en: 'Gifts (Mercury)' },
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
    { key: 'confirmationEnabled', label: { id: 'Aktifkan form konfirmasi', en: 'Enable confirmation form' }, type: 'boolean' },
  ],
  defaults: {
    sectionLabel: 'Gifts',
    heading: 'Your presence is the gift. But if you insist…',
    accounts: [{ bank: 'BCA', number: '1234567890', name: 'Aruna K.' }],
    confirmationEnabled: true,
  },
}
