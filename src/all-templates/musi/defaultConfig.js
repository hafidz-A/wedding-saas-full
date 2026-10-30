/* ============================================================
   musi/defaultConfig.js — bundled demo content.

   Rendered for the demo slug (/musi/demo-musi) and used as the base of a new
   couple's config (see seed.js). Plain data only — this file is pulled in by
   the server-safe src/config/templateIndex.js, so it must never import a
   component or three.js.

   Section order IS the journey: cover (the Rumah Limas) → quote (the flight
   over South Sumatra) → couple, story, save the date, events, gallery (the
   boat ride down the Musi, one landmark each), then the ordinary-scroll cards
   (RSVP, wishes, gift) over the night city and the closing with fireworks.
   The editor locks the order (src/editor/templatePolicy.ts); switching a
   journey section off squeezes its stretch of the ride (config/timeline.js).
   ============================================================ */
import { DEMO_GALLERY, DEMO_PHOTOS } from './config/assets.js'
import { DEFAULT_MUSI_PALETTE } from './config/palettes.js'

// A date that is always in the future, so the demo countdown keeps counting.
const now = new Date()
const demoYear = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear()
const demoDate = `${demoYear}-06-20T08:00`

export const defaultConfig = {
  // name1 = bride, name2 = groom (the platform-wide convention).
  couple: { name1: 'Laras', name2: 'Fauzan' },
  meta: {
    titleSuffix: 'Undangan Pernikahan',
    description: 'Dari Rumah Limas, menyusuri Sungai Musi, sampai kembang api di langit Palembang.',
  },
  theme: { defaultPalette: DEFAULT_MUSI_PALETTE },

  // WhatsApp invite message used by the Guests tab. {{kode}} is the guest's
  // single-use RSVP code — required, the RSVP and wish forms won't accept a
  // guest without it.
  inviteMessageTemplate:
    'Halo {{name}},\n\nDengan penuh sukacita kami mengundang Anda untuk hadir di hari bahagia kami. ' +
    'Buka undangannya di tautan berikut:\n\n{{url}}' +
    '\n\nKode undangan kamu: {{kode}} (untuk satu RSVP dan satu ucapan)\n\nTerima kasih 🙏',

  sections: [
    {
      id: 'cover',
      type: 'musiCover',
      enabled: true,
      props: {
        eyebrow: 'Pernikahan',
        greeting: 'Kepada Yth. Bapak/Ibu/Saudara/i',
        guestFallback: 'Tamu Undangan',
        openLabel: 'Buka Undangan',
      },
    },
    {
      id: 'quote',
      type: 'musiQuote',
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
      type: 'musiCouple',
      enabled: true,
      props: {
        groomLabel: 'Mempelai Pria',
        groomNickname: 'Fauzan',
        groomFullName: 'Kms. Ahmad Fauzan',
        groomParents: 'Putra dari Bapak Kms. H. Abdul Rahman & Ibu Hj. Nurhasanah',
        groomPhoto: DEMO_PHOTOS.groom,
        brideLabel: 'Mempelai Wanita',
        brideNickname: 'Laras',
        brideFullName: 'Nyimas Ayu Larasati',
        brideParents: 'Putri dari Bapak Mgs. Hendra Saputra & Ibu Masayu Rosmala Dewi',
        bridePhoto: DEMO_PHOTOS.bride,
      },
    },
    {
      id: 'story',
      type: 'musiStory',
      enabled: true,
      props: {
        label: 'Kisah Kami',
        moments: [
          { id: 'm1', year: '2019', title: 'Pertama Bertemu', body: 'Di tepian Musi saat lomba perahu bidar, kami berebut tempat menonton yang sama, lalu memilih berbagi.' },
          { id: 'm2', year: '2022', title: 'Saling Menjaga', body: 'Beda kota, beda jadwal, tapi kiriman pempek dan telepon setiap malam tidak pernah absen.' },
          { id: 'm3', year: '2026', title: 'Lamaran', body: 'Senja di Benteng Kuto Besak, Ampera mulai menyala. Fauzan bertanya, Laras menjawab iya.' },
        ],
      },
    },
    {
      id: 'saveDate',
      type: 'musiSaveDate',
      enabled: true,
      props: {
        label: 'Simpan Tanggal',
        date: demoDate,
        timezone: 'WIB',
        showCountdown: true,
        calendarLabel: 'Simpan ke Kalender',
      },
    },
    {
      id: 'events',
      type: 'musiEvents',
      enabled: true,
      props: {
        label: 'Rangkaian Acara',
        events: [
          { id: 'akad', title: 'Akad Nikah', time: '08.00 WIB' },
          { id: 'resepsi', title: 'Resepsi', time: '11.00–14.00 WIB' },
        ],
        venue: 'Rumah Limas Keluarga',
        address: 'Jl. Sudirman No. 88, Palembang',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Palembang',
        mapLabel: 'Buka Peta',
        liveUrl: '',
        liveLabel: 'Tonton Live',
      },
    },
    {
      id: 'gallery',
      type: 'musiGallery',
      enabled: true,
      props: {
        title: 'Galeri',
        hint: 'Geser untuk melihat, ketuk untuk memperbesar',
        photos: DEMO_GALLERY,
      },
    },
    {
      id: 'rsvp',
      type: 'musiRsvp',
      enabled: true,
      props: {
        label: 'RSVP',
        title: 'Konfirmasi Kehadiran',
        subtitle: 'Mohon kabari kami sebelum 10 Juni.',
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
        subtitle: 'Tulis doa dan ucapanmu — setiap doa menyalakan satu kembang api di langit Palembang.',
        // Shown on the demo only; a real invitation gets its saved wishes
        // injected here server-side (page.tsx → initialNotes).
        initialNotes: [
          { id: 'n1', name: 'Keluarga Pak Ilyas', message: 'Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.', color: 'gold' },
          { id: 'n2', name: 'Rina & Dimas', message: 'Barakallahu lakuma wa baraka alaikuma. Kami insyaAllah hadir.', color: 'gold' },
          { id: 'n3', name: 'Sari', message: 'Maaf belum bisa datang karena tugas di luar kota. Doa terbaik untuk kalian berdua!', color: 'gold' },
        ],
      },
    },
    {
      id: 'gift',
      type: 'musiGift',
      enabled: true,
      props: {
        label: 'Amplop Digital',
        title: 'Tanda Kasih',
        intro: 'Doa restu Anda sudah lebih dari cukup. Bagi yang ingin memberi tanda kasih, bisa melalui:',
        // Same account shape as Lovebirds, so src/lib/crypto/config.ts encrypts
        // accountNumber + accountHolder at rest (and keeps the bank name plain).
        accounts: [
          { id: 'bsi', type: 'bank', name: 'BSI', accountNumber: '7123456789', accountHolder: 'Ahmad Fauzan' },
          { id: 'bca', type: 'bank', name: 'BCA', accountNumber: '0987654321', accountHolder: 'Nyimas Ayu Larasati' },
          { id: 'dana', type: 'ewallet', name: 'DANA', accountNumber: '081234567890', accountHolder: 'Nyimas Ayu Larasati' },
        ],
        giftAddress: 'Jl. Sudirman No. 88, Palembang 30129',
      },
    },
    {
      id: 'closing',
      type: 'musiClosing',
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
