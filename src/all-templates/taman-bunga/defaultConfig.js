/* ============================================================
   taman-bunga/defaultConfig.js — bundled demo content.

   Rendered for the demo slug (/taman-bunga/demo-taman-bunga) and used as the
   base of a new couple's config (see seed.js). Plain data only — this file is
   pulled in by the server-safe src/config/templateIndex.js, so it must never
   import a component.

   Section order IS the walk: cover → quote → couple → love story → save the
   date → events → gallery, then the ordinary-scroll cards (RSVP, wishes, gift)
   and the closing. The editor locks the order (src/editor/templatePolicy.ts);
   switching a journey section off squeezes its stretch of the walk instead of
   leaving a gap (config/timeline.js).
   ============================================================ */
import { DEMO_PHOTOS } from './config/assets.js'
import { DEFAULT_TAMAN_BUNGA_PALETTE } from './config/palettes.js'

// A date that is always in the future, so the demo countdown keeps counting.
const now = new Date()
const demoYear = now.getMonth() >= 1 ? now.getFullYear() + 1 : now.getFullYear()
const demoDate = `${demoYear}-02-14T08:00`

export const defaultConfig = {
  // name1 = bride, name2 = groom (the platform-wide convention).
  couple: { name1: 'Nadia', name2: 'Arya' },
  meta: {
    titleSuffix: 'Undangan Pernikahan',
    description: 'Berjalanlah bersama kami menyusuri taman bunga, dari senja hingga malam.',
  },
  theme: { defaultPalette: DEFAULT_TAMAN_BUNGA_PALETTE },

  // WhatsApp invite message used by the Guests tab. {{kode}} is the guest's
  // single-use RSVP code — required, the RSVP and wish forms won't accept a
  // guest without it.
  inviteMessageTemplate:
    'Halo {{name}},\n\nDengan penuh sukacita kami mengundang Anda untuk hadir di hari bahagia kami. ' +
    'Buka undangannya di tautan berikut:\n\n{{url}}' +
    '\n\nKode undangan kamu: {{kode}} (sekali pakai, untuk RSVP atau ucapan)\n\nTerima kasih 🙏',

  sections: [
    {
      id: 'cover',
      type: 'tbCover',
      enabled: true,
      props: {
        eyebrow: 'The Wedding of',
        greeting: 'Kepada Yth. Bapak/Ibu/Saudara/i',
        guestFallback: 'Tamu Undangan',
        openLabel: 'Buka Undangan',
      },
    },
    {
      id: 'quote',
      type: 'tbQuote',
      enabled: true,
      props: {
        label: 'Bismillahirrahmanirrahim',
        text:
          'Dan di antara tanda-tanda kebesaran-Nya, Dia menciptakan pasangan untukmu dari jenismu sendiri, ' +
          'agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
        source: 'QS. Ar-Rum : 21',
      },
    },
    {
      id: 'couple',
      type: 'tbCouple',
      enabled: true,
      props: {
        groomLabel: 'Mempelai Pria',
        groomNickname: 'Arya',
        groomFullName: 'Arya Pratama Wibisono',
        groomParents: 'Putra dari Bapak Hendra Wibisono & Ibu Ratna Sari',
        groomPhoto: DEMO_PHOTOS.groom,
        brideLabel: 'Mempelai Wanita',
        brideNickname: 'Nadia',
        brideFullName: 'Nadia Larasati Putri',
        brideParents: 'Putri dari Bapak Agus Santoso & Ibu Dewi Lestari',
        bridePhoto: DEMO_PHOTOS.bride,
      },
    },
    {
      id: 'story',
      type: 'tbStory',
      enabled: true,
      props: {
        label: 'Kisah Kami',
        moments: [
          { id: 'm1', year: '2019', title: 'Pertama Bertemu', body: 'Di sebuah pameran buku di Bogor, obrolan singkat soal novel favorit berlanjut sampai panitia mematikan lampu.' },
          { id: 'm2', year: '2022', title: 'Saling Menjaga', body: 'Beda kota, beda jadwal, tapi telepon setiap malam tidak pernah absen. Jarak justru membuat kami yakin.' },
          { id: 'm3', year: '2026', title: 'Lamaran', body: 'Di taman saat senja, Arya bertanya. Nadia menjawab iya sebelum pertanyaannya selesai.' },
        ],
      },
    },
    {
      id: 'saveDate',
      type: 'tbSaveDate',
      enabled: true,
      props: {
        label: 'Save the Date',
        date: demoDate,
        timezone: 'WIB',
        showCountdown: true,
        calendarLabel: 'Simpan ke Kalender',
      },
    },
    {
      id: 'events',
      type: 'tbEvents',
      enabled: true,
      props: {
        label: 'Rangkaian Acara',
        events: [
          { id: 'akad', title: 'Akad', time: '08.00 WIB' },
          { id: 'resepsi', title: 'Resepsi', time: '11.00–13.00 WIB' },
        ],
        venue: 'Taman Kencana Ballroom',
        address: 'Jl. Kencana Raya No. 12, Bogor',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Taman+Kencana+Bogor',
        mapLabel: 'Buka Peta',
        liveUrl: '',
        liveLabel: 'Tonton Live',
      },
    },
    {
      id: 'gallery',
      type: 'tbGallery',
      enabled: true,
      props: {
        title: 'Galeri',
        hint: 'Ketuk foto untuk memperbesar',
        photos: [
          { src: DEMO_PHOTOS.couple, alt: 'Nadia dan Arya' },
          { src: DEMO_PHOTOS.groom, alt: 'Arya' },
          { src: DEMO_PHOTOS.bride, alt: 'Nadia' },
          { src: DEMO_PHOTOS.coupleClose, alt: 'Nadia dan Arya, dekat' },
        ],
      },
    },
    {
      id: 'rsvp',
      type: 'tbRsvp',
      enabled: true,
      props: {
        label: 'RSVP',
        title: 'Konfirmasi Kehadiran',
        subtitle: 'Mohon kabari kami sebelum 31 Januari.',
        maxGuests: '2',
      },
    },
    {
      id: 'wishes',
      type: 'guestbook',
      enabled: true,
      props: {
        label: 'Ucapan & Doa',
        title: 'Doa untuk Kami',
        subtitle: 'Tulis doa dan ucapanmu — setiap doa ikut menerbangkan satu lampion.',
        // Shown on the demo only; a real invitation gets its saved wishes
        // injected here server-side (page.tsx → initialNotes).
        initialNotes: [
          { id: 'n1', name: 'Rina & Dimas', message: 'Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.', color: 'gold' },
          { id: 'n2', name: 'Keluarga Pak Budi', message: 'Barakallahu lakuma wa baraka alaikuma. Kami sekeluarga insyaAllah hadir.', color: 'coral' },
          { id: 'n3', name: 'Sari', message: 'Maaf belum bisa datang karena tugas di luar kota. Doa terbaik untuk kalian berdua!', color: 'sky' },
          { id: 'n4', name: 'Tante Wulan', message: 'Nadia cantik, semoga bahagia selalu bersama Arya.', color: 'purple' },
        ],
      },
    },
    {
      id: 'gift',
      type: 'tbGift',
      enabled: true,
      props: {
        label: 'Amplop Digital',
        title: 'Tanda Kasih',
        intro: 'Doa restu Anda sudah lebih dari cukup. Bagi yang ingin memberi tanda kasih, bisa melalui:',
        // Same account shape as Lovebirds, so src/lib/crypto/config.ts encrypts
        // accountNumber + accountHolder at rest (and keeps the bank name plain).
        accounts: [
          { id: 'bca', type: 'bank', name: 'BCA', accountNumber: '1234567890', accountHolder: 'Arya Pratama Wibisono' },
          { id: 'mandiri', type: 'bank', name: 'Mandiri', accountNumber: '0987654321', accountHolder: 'Nadia Larasati Putri' },
          { id: 'gopay', type: 'ewallet', name: 'GoPay', accountNumber: '081234567890', accountHolder: 'Nadia Larasati Putri' },
        ],
        giftAddress: 'Jl. Melati No. 8, Bogor 16128',
      },
    },
    {
      id: 'closing',
      type: 'tbClosing',
      enabled: true,
      props: {
        label: 'Terima Kasih',
        text: 'Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
        // not `photo`: fillEmptyImages would back-fill a blank `photo` with a
        // stranger's stock portrait. A blank couplePhoto shows the couple's initials.
        couplePhoto: DEMO_PHOTOS.couple,
      },
    },
  ],
}

export default defaultConfig
