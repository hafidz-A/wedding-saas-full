import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: { id: 'Coral', en: 'Coral' } },
  { value: 'emerald', label: { id: 'Emerald', en: 'Emerald' } },
  { value: 'gold',    label: { id: 'Gold', en: 'Gold' } },
  { value: 'sky',     label: { id: 'Sky', en: 'Sky' } },
  { value: 'purple',  label: { id: 'Purple', en: 'Purple' } },
]

export const weddingGiftSchema: SectionSchema = {
  type: 'weddingGift',
  label: { id: 'Hadiah Pernikahan', en: 'Wedding Gift' },
  fields: [
    { key: 'title',               label: { id: 'Judul', en: 'Title' },                 type: 'text' },
    { key: 'subtitle',            label: { id: 'Subjudul', en: 'Subtitle' },           type: 'text' },
    { key: 'intro',               label: { id: 'Pengantar', en: 'Intro' },             type: 'textarea', rows: 3 },
    { key: 'confirmationEnabled', label: { id: 'Tampilkan form konfirmasi', en: 'Show confirmation form' }, type: 'boolean' },
    {
      key: 'accounts',
      label: { id: 'Rekening', en: 'Accounts' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', type: 'bank', name: '', accountNumber: '', accountHolder: '', accent: 'coral' },
      itemFields: [
        { key: 'type',          label: { id: 'Jenis', en: 'Type' }, type: 'select', options: [
          { value: 'bank',    label: { id: 'Bank', en: 'Bank' } },
          { value: 'ewallet', label: { id: 'E-wallet', en: 'E-wallet' } },
        ] },
        { key: 'name',          label: { id: 'Nama bank / dompet', en: 'Bank / wallet name' }, type: 'text' },
        { key: 'accountNumber', label: { id: 'Nomor rekening', en: 'Account number' },         type: 'text' },
        { key: 'accountHolder', label: { id: 'Atas nama', en: 'Account holder' },              type: 'text' },
        { key: 'accent',        label: { id: 'Warna aksen', en: 'Accent' },                    type: 'select', options: ACCENTS },
      ],
    },
    { key: 'giftAddress', label: { id: 'Alamat kado fisik', en: 'Physical-gift address' }, type: 'textarea', rows: 3 },
  ],
  defaults: {
    title: 'Wedding Gift',
    subtitle: 'Tanda kasih untuk perjalanan kami berikutnya',
    intro: 'Kehadiran Anda adalah hadiah terbesar bagi kami. Namun bila Anda berkenan memberikan tanda kasih, kami menyediakan beberapa opsi berikut.',
    confirmationEnabled: true,
    accounts: [
      { id: 'bca-bride',     type: 'bank', name: 'BCA',     accountNumber: '1234567890',    accountHolder: 'Aurelia Sastrawijaya', accent: 'coral'   },
      { id: 'mandiri-groom', type: 'bank', name: 'Mandiri', accountNumber: '1450098876543', accountHolder: 'Hadyan Pratama',       accent: 'emerald' },
    ],
    giftAddress: 'Untuk kado fisik, mohon kirimkan ke alamat: Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan 12190.',
  },
}
