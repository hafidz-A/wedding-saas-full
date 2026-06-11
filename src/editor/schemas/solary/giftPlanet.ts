import type { SectionSchema } from '../types'
import { demoImg } from '@/lib/demoImages'

export const giftPlanetSchema: SectionSchema = {
  type: 'giftPlanet',
  label: { id: 'Hadiah', en: 'Gifts' },
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
    { key: 'registryEnabled', label: { id: 'Tampilkan wishlist / registry', en: 'Show wishlist / registry' }, type: 'boolean' },
    { key: 'registryTitle',   label: { id: 'Judul wishlist', en: 'Wishlist title' }, type: 'text' },
    { key: 'registryMessage', label: { id: 'Pesan wishlist', en: 'Wishlist message' }, type: 'textarea', rows: 2 },
    {
      key: 'wishlist',
      label: { id: 'Item wishlist', en: 'Wishlist items' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { name: '', description: '', image: '', url: '' },
      itemFields: [
        { key: 'name',        label: { id: 'Nama', en: 'Name' }, type: 'text' },
        { key: 'description', label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 2 },
        { key: 'image',       label: { id: 'Gambar', en: 'Image' }, type: 'image' },
        { key: 'url',         label: { id: 'Link (opsional)', en: 'Link (optional)' }, type: 'text' },
      ],
    },
  ],
  defaults: {
    sectionLabel: 'Gifts',
    heading: 'Your presence is the gift. But if you insist…',
    accounts: [{ bank: 'BCA', number: '1234567890', name: 'Aruna K.' }],
    confirmationEnabled: true,
    registryEnabled: true,
    registryTitle: 'Wishlist Kami',
    registryMessage: 'Bila Anda berkenan memberi hadiah, berikut beberapa hal yang kami impikan.',
    wishlist: [
      { name: 'Set Peralatan Masak', description: 'Untuk memasak bersama di dapur baru kami.', image: demoImg('wishlistCookware', 600), url: '' },
      { name: 'Voucher Bulan Madu', description: 'Membantu kami menjelajah destinasi impian.', image: demoImg('wishlistHoneymoon', 600), url: '' },
    ],
  },
}
