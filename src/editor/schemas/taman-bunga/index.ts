import type { SectionSchema } from '../types'
import { guestbookSchema } from '../guestbook'

/* Taman Bunga editor schemas — one per section type in
   src/all-templates/taman-bunga/registry.js. The couple's names are not a
   field here: the template reads them straight from config.couple (the
   central Couple panel), so there is nothing to lock. maxItems match the
   renderer clamps (Journey.jsx). */

const TIMEZONES = [
  { value: 'WIB',  label: { id: 'WIB', en: 'WIB (UTC+7)' } },
  { value: 'WITA', label: { id: 'WITA', en: 'WITA (UTC+8)' } },
  { value: 'WIT',  label: { id: 'WIT', en: 'WIT (UTC+9)' } },
]

const MAX_GUESTS = ['1', '2', '3', '4', '5'].map((n) => ({ value: n, label: { id: `${n} orang`, en: `${n} guest${n === '1' ? '' : 's'}` } }))

export const tbCoverSchema: SectionSchema = {
  type: 'tbCover',
  label: { id: 'Gerbang Pembuka', en: 'Opening Gate' },
  fields: [
    { key: 'eyebrow',       label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'greeting',      label: { id: 'Sapaan tamu', en: 'Guest greeting' }, type: 'text' },
    { key: 'guestFallback', label: { id: 'Nama tamu default', en: 'Default guest name' }, type: 'text', help: { id: 'Dipakai bila tautan tidak membawa nama tamu (?to=)', en: 'Used when the link carries no guest name (?to=)' } },
    { key: 'openLabel',     label: { id: 'Teks tombol', en: 'Button label' }, type: 'text' },
  ],
}

export const tbQuoteSchema: SectionSchema = {
  type: 'tbQuote',
  label: { id: 'Kutipan', en: 'Quote' },
  fields: [
    { key: 'label',  label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'text',   label: { id: 'Kutipan', en: 'Quote' }, type: 'textarea', rows: 4 },
    { key: 'source', label: { id: 'Sumber', en: 'Source' }, type: 'text' },
  ],
}

export const tbCoupleSchema: SectionSchema = {
  type: 'tbCouple',
  label: { id: 'Mempelai', en: 'Bride & Groom' },
  fields: [
    { key: 'groomLabel',    label: { id: 'Label mempelai pria', en: 'Groom label' }, type: 'text' },
    { key: 'groomNickname', label: { id: 'Nama panggilan pria', en: 'Groom nickname' }, type: 'text' },
    { key: 'groomFullName', label: { id: 'Nama lengkap pria', en: 'Groom full name' }, type: 'text' },
    { key: 'groomParents',  label: { id: 'Orang tua pria', en: "Groom's parents" }, type: 'textarea', rows: 2 },
    { key: 'groomPhoto',    label: { id: 'Foto mempelai pria', en: 'Groom photo' }, type: 'image', help: { id: 'Foto potret (tegak) paling pas di bingkai jendela', en: 'A portrait (upright) photo fits the window frame best' } },
    { key: 'brideLabel',    label: { id: 'Label mempelai wanita', en: 'Bride label' }, type: 'text' },
    { key: 'brideNickname', label: { id: 'Nama panggilan wanita', en: 'Bride nickname' }, type: 'text' },
    { key: 'brideFullName', label: { id: 'Nama lengkap wanita', en: 'Bride full name' }, type: 'text' },
    { key: 'brideParents',  label: { id: 'Orang tua wanita', en: "Bride's parents" }, type: 'textarea', rows: 2 },
    { key: 'bridePhoto',    label: { id: 'Foto mempelai wanita', en: 'Bride photo' }, type: 'image' },
  ],
}

export const tbStorySchema: SectionSchema = {
  type: 'tbStory',
  label: { id: 'Kisah Kami', en: 'Our Story' },
  fields: [
    { key: 'label', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'moments',
      label: { id: 'Momen', en: 'Moments' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', year: '', title: '', body: '' },
      // Each moment is one lantern-lit stop along the path; more than 5 makes
      // the stops flash past too quickly. Journey.jsx clamps to the same number.
      maxItems: 5,
      itemFields: [
        { key: 'year',  label: { id: 'Tahun', en: 'Year' }, type: 'text' },
        { key: 'title', label: { id: 'Judul', en: 'Title' }, type: 'text' },
        { key: 'body',  label: { id: 'Cerita', en: 'Story' }, type: 'textarea', rows: 3 },
      ],
    },
  ],
}

export const tbSaveDateSchema: SectionSchema = {
  type: 'tbSaveDate',
  label: { id: 'Simpan Tanggal', en: 'Save the Date' },
  fields: [
    { key: 'label',         label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'date',          label: { id: 'Tanggal & jam', en: 'Date & time' }, type: 'datetime' },
    { key: 'timezone',      label: { id: 'Zona waktu', en: 'Time zone' }, type: 'select', options: TIMEZONES, defaultValue: 'WIB' },
    { key: 'showCountdown', label: { id: 'Tampilkan hitung mundur', en: 'Show countdown' }, type: 'boolean' },
    { key: 'calendarLabel', label: { id: 'Teks tombol kalender', en: 'Calendar button label' }, type: 'text' },
  ],
}

export const tbEventsSchema: SectionSchema = {
  type: 'tbEvents',
  label: { id: 'Rangkaian Acara', en: 'Events' },
  fields: [
    { key: 'label', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'events',
      label: { id: 'Acara', en: 'Events' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', title: '', time: '' },
      // The panel fits three rows over the garden; Journey.jsx clamps to 3.
      maxItems: 3,
      itemFields: [
        { key: 'title', label: { id: 'Nama acara', en: 'Event name' }, type: 'text' },
        { key: 'time',  label: { id: 'Waktu', en: 'Time' }, type: 'text', help: { id: 'Contoh: 08.00 WIB', en: 'e.g. 08.00 WIB' } },
      ],
    },
    { key: 'venue',     label: { id: 'Tempat', en: 'Venue' }, type: 'text' },
    { key: 'address',   label: { id: 'Alamat', en: 'Address' }, type: 'textarea', rows: 2 },
    { key: 'mapUrl',    label: { id: 'Link Google Maps', en: 'Google Maps link' }, type: 'text' },
    { key: 'mapLabel',  label: { id: 'Teks tombol peta', en: 'Map button label' }, type: 'text' },
    { key: 'liveUrl',   label: { id: 'Link siaran langsung (opsional)', en: 'Live stream link (optional)' }, type: 'text' },
    { key: 'liveLabel', label: { id: 'Teks tombol siaran', en: 'Live button label' }, type: 'text' },
  ],
}

export const tbGallerySchema: SectionSchema = {
  type: 'tbGallery',
  label: { id: 'Galeri', en: 'Gallery' },
  fields: [
    { key: 'title', label: { id: 'Judul', en: 'Title' }, type: 'text' },
    { key: 'hint',  label: { id: 'Petunjuk', en: 'Hint' }, type: 'text' },
    {
      key: 'photos',
      label: { id: 'Foto', en: 'Photos' },
      type: 'objectArray',
      itemLabelKey: 'alt',
      newItem: { src: '', alt: '' },
      // Photos hang on a garland strand; Journey.jsx clamps to 30.
      maxItems: 30,
      itemFields: [
        { key: 'src', label: { id: 'Foto', en: 'Photo' }, type: 'image' },
        { key: 'alt', label: { id: 'Keterangan', en: 'Caption' }, type: 'text' },
      ],
    },
  ],
}

export const tbRsvpSchema: SectionSchema = {
  type: 'tbRsvp',
  label: { id: 'RSVP', en: 'RSVP' },
  fields: [
    { key: 'label',     label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'title',     label: { id: 'Judul', en: 'Title' }, type: 'text' },
    { key: 'subtitle',  label: { id: 'Subjudul', en: 'Subtitle' }, type: 'text' },
    { key: 'maxGuests', label: { id: 'Maks. tamu per undangan', en: 'Max guests per invite' }, type: 'select', options: MAX_GUESTS, defaultValue: '2' },
  ],
}

// Wishes reuse the shared `guestbook` type so page.tsx injects the approved
// notes; only the label set differs (the lantern colour is picked by guests).
export const tbWishesSchema: SectionSchema = {
  ...guestbookSchema,
  label: { id: 'Ucapan & Doa', en: 'Wishes' },
  fields: [
    { key: 'label', label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    ...guestbookSchema.fields.filter((f) => f.key !== 'initialNotes'),
  ],
  defaults: undefined,
}

export const tbGiftSchema: SectionSchema = {
  type: 'tbGift',
  label: { id: 'Amplop Digital', en: 'Digital Gift' },
  fields: [
    { key: 'label', label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'title', label: { id: 'Judul', en: 'Title' }, type: 'text' },
    { key: 'intro', label: { id: 'Pengantar', en: 'Intro' }, type: 'textarea', rows: 3 },
    {
      key: 'accounts',
      label: { id: 'Rekening', en: 'Accounts' },
      type: 'objectArray',
      itemLabelKey: 'name',
      // Same shape as Lovebirds weddingGift.accounts, so the at-rest
      // encryption of accountNumber/accountHolder applies unchanged.
      newItem: { id: '', type: 'bank', name: '', accountNumber: '', accountHolder: '' },
      maxItems: 6,
      itemFields: [
        { key: 'type', label: { id: 'Jenis', en: 'Type' }, type: 'select', options: [
          { value: 'bank',    label: { id: 'Bank', en: 'Bank' } },
          { value: 'ewallet', label: { id: 'E-wallet', en: 'E-wallet' } },
        ] },
        { key: 'name',          label: { id: 'Nama bank / dompet', en: 'Bank / wallet name' }, type: 'text' },
        { key: 'accountNumber', label: { id: 'Nomor rekening', en: 'Account number' }, type: 'text' },
        { key: 'accountHolder', label: { id: 'Atas nama', en: 'Account holder' }, type: 'text' },
      ],
    },
    { key: 'giftAddress', label: { id: 'Alamat kado fisik', en: 'Physical-gift address' }, type: 'textarea', rows: 3 },
  ],
}

export const tbClosingSchema: SectionSchema = {
  type: 'tbClosing',
  label: { id: 'Penutup', en: 'Closing' },
  fields: [
    { key: 'label',       label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'text',        label: { id: 'Ucapan penutup', en: 'Closing message' }, type: 'textarea', rows: 4 },
    { key: 'couplePhoto', label: { id: 'Foto berdua', en: 'Couple photo' }, type: 'image', help: { id: 'Kosongkan untuk menampilkan inisial kalian', en: 'Leave empty to show your initials' } },
  ],
}

export const tamanBungaSchemaRegistry: Record<string, SectionSchema> = {
  tbCover:    tbCoverSchema,
  tbQuote:    tbQuoteSchema,
  tbCouple:   tbCoupleSchema,
  tbStory:    tbStorySchema,
  tbSaveDate: tbSaveDateSchema,
  tbEvents:   tbEventsSchema,
  tbGallery:  tbGallerySchema,
  tbRsvp:     tbRsvpSchema,
  guestbook:  tbWishesSchema,
  tbGift:     tbGiftSchema,
  tbClosing:  tbClosingSchema,
}
