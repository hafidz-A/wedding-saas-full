/* Songket default/demo config — rendered when no Supabase row exists.
   Same section types + prop shapes as the Lovebirds demo (this template is a
   Lovebirds fork), with Palembang content and the adat palette/ornament.

   ⚠️ Adat wording (tahapan, salam) is a draft pending review by a Palembang
   adat source — see docs/superpowers/specs/2026-10-12-template-adat-palembang-design.md.
   Photos are the Lovebirds demo set as placeholders until adat-attire photos exist. */

import { songketImg as demoImg } from './demoImages.js'

// Aesan Gede silhouette portraits (public/songket/demo) — stand-ins for the
// couple's own photos. Plain local paths, NOT staticAsset(): these files are
// not in the R2 static set, so they must not follow NEXT_PUBLIC_STATIC_ASSET_HOST.
const BRIDE_SILHOUETTE = '/songket/demo/bride-aesan-gede.svg'
const GROOM_SILHOUETTE = '/songket/demo/groom-aesan-gede.svg'

// Always a future date so the demo countdown keeps running.
const now = new Date()
const targetYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear()
const demoWeddingDate = `${targetYear}-12-12T09:00:00+07:00`
const dateText = `Sabtu, 12 Desember ${targetYear}`

export const defaultConfig = {
  couple: { name1: 'Ayu', name2: 'Rizky' },
  meta: {
    title: 'Ayu & Rizky — Undangan Pernikahan',
    description: 'Undangan pernikahan adat Palembang',
  },
  theme: { defaultPalette: 'merahLak', ornamentType: 'melati' },

  // WhatsApp invite template for the Guests tab — {{kode}} is REQUIRED.
  inviteMessageTemplate:
    "Assalamu'alaikum {{name}},\n\nDengan memohon rahmat Allah SWT, kami mengundang Bapak/Ibu/Saudara/i " +
    'untuk hadir di acara pernikahan kami. Detail acara & konfirmasi kehadiran:\n\n{{url}}' +
    '\n\nKode RSVP: {{kode}} (sekali pakai)\n\nTerima kasih 🙏',

  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      props: {
        coupleName: 'Ayu & Rizky',
        brideName: 'Ayu',
        groomName: 'Rizky',
        weddingDate: demoWeddingDate,
        venue: 'Palembang, Sumatera Selatan',
        welcomeText: 'Kepada Yth. Bapak/Ibu/Saudara/i',
        scrollHint: 'Gulir untuk masuk',
        countdownEnabled: true,
        gateImage: demoImg('coupleGate', 2000),
        blastPhotos: [
          demoImg('bridePortrait', 500),
          demoImg('storyWedding', 500),
          demoImg('storyFirstMeet', 500),
          demoImg('coupleClassic', 500),
          demoImg('galleryRoadTrip', 500),
          demoImg('galleryFirstDance', 500),
          demoImg('galleryCoffee', 500),
          demoImg('galleryFamilyDinner', 500),
        ],
        // Adat petals (components/adat/AdatPetals.jsx).
        petals: ['tabur', 'melati', 'roset', 'sirih', 'tabur', 'melati', 'kembang', 'roset'],
      },
    },

    {
      id: 'quote',
      type: 'quote',
      enabled: true,
      props: {
        text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
        attribution: 'QS Ar-Rum: 21',
      },
    },

    {
      id: 'ourStory',
      type: 'ourStory',
      enabled: true,
      props: {
        title: 'Menuju Hari Bahagia',
        stories: [
          { id: 'madik', year: 'Madik', date: 'Saling mengenal', title: 'Madik',
            description: 'Keluarga mempelai pria berkenalan dan menjajaki keluarga mempelai wanita.',
            image: demoImg('storyFirstMeet', 1400) },
          { id: 'ngebet', year: 'Ngebet', date: 'Tanda ikatan', title: 'Ngebet',
            description: 'Tanda pengikat diantarkan sebagai janji kedua keluarga.',
            image: demoImg('storyFirstDate', 1400) },
          { id: 'berasan', year: 'Berasan', date: 'Musyawarah keluarga', title: 'Berasan',
            description: 'Dua keluarga bermusyawarah menentukan hari baik dan persiapan pernikahan.',
            image: demoImg('storyHoliday', 1400) },
          { id: 'belanjo', year: 'Belanjo', date: 'Mengantar seserahan', title: 'Nganterke Belanjo',
            description: 'Keluarga mempelai pria mengantarkan seserahan dan belanjo dalam tenong.',
            image: demoImg('storyProposal', 1400) },
          { id: 'munggah', year: String(targetYear), date: dateText, title: 'Akad & Munggah',
            description: 'Akad nikah, lalu kedua mempelai bersanding dalam busana Aesan Gede.',
            image: demoImg('storyWedding', 1400) },
        ],
      },
    },

    {
      id: 'eventDetails',
      type: 'eventDetails',
      enabled: true,
      props: {
        title: 'Akad & Resepsi',
        subtitle: 'Dengan penuh hormat kami menantikan kehadiran Anda',
        events: [
          { id: 'akad', label: 'Akad Nikah', icon: 'rings', date: dateText, time: '08.00 — 10.00 WIB',
            location: 'Kediaman Mempelai Wanita, Palembang', accent: 'gold' },
          { id: 'resepsi', label: 'Resepsi (Munggah)', icon: 'champagne', date: dateText, time: '11.00 — 15.00 WIB',
            location: 'Balai Pertemuan, Palembang', accent: 'coral' },
          { id: 'busana', label: 'Busana', icon: 'sparkle', date: 'Batik / songket / kebaya',
            time: 'Nuansa merah & emas', location: 'Silakan berbusana nasional atau adat', accent: 'emerald' },
        ],
        mapEmbed: 'https://www.google.com/maps?q=-2.9917,104.7633&z=14&output=embed',
      },
    },

    {
      id: 'brideGroom',
      type: 'brideGroom',
      enabled: true,
      props: {
        title: 'Kedua Mempelai',
        people: [
          {
            role: 'Mempelai Wanita',
            name: 'Ayu Lestari',
            photo: BRIDE_SILHOUETTE,
            parents: 'Putri dari Bapak H. Ahmad Syarif & Ibu Hj. Fatimah',
            bio: 'Lahir dan besar di Palembang, senang menenun cerita dan merawat tradisi keluarga.',
            instagram: '@ayu.lestari',
            direction: 'right',
          },
          {
            role: 'Mempelai Pria',
            name: 'Muhammad Rizky',
            photo: GROOM_SILHOUETTE,
            parents: 'Putra dari Bapak H. Hasan Basri & Ibu Hj. Aminah',
            bio: 'Anak Sungai Musi yang percaya rumah adalah tempat semua orang berkumpul.',
            instagram: '@m.rizky',
            direction: 'left',
          },
        ],
      },
    },

    {
      id: 'galleryMasonry',
      type: 'galleryMasonry',
      enabled: true,
      navLabel: 'Galeri',
      props: {
        eyebrow: 'Galeri',
        sectionTitle: 'Kenangan Kami',
        sectionSubtitle: 'Sepenggal momen yang kami simpan',
        photos: [
          { src: demoImg('storyProposal', 600), alt: 'Lamaran' },
          { src: demoImg('coupleCasual', 600), alt: 'Kami berdua' },
          { src: demoImg('galleryBirthday', 600), alt: 'Kejutan' },
          { src: demoImg('coupleClassic', 600), alt: 'Hari bahagia' },
          { src: demoImg('gallerySunrise', 600), alt: 'Pagi hari' },
          { src: demoImg('galleryRoadTrip', 600), alt: 'Perjalanan' },
          { src: demoImg('storyHoliday', 600), alt: 'Liburan' },
          { src: demoImg('storyFirstDate', 600), alt: 'Kencan pertama' },
          { src: demoImg('galleryCoffee', 600), alt: 'Kopi pagi' },
          { src: demoImg('galleryCityLights', 600), alt: 'Lampu kota' },
          { src: demoImg('gallerySunsetWalk', 600), alt: 'Senja' },
          { src: demoImg('galleryRings', 600), alt: 'Cincin' },
        ],
      },
    },

    {
      id: 'schedule',
      type: 'schedule',
      enabled: true,
      props: {
        title: 'Rangkaian Acara',
        subtitle: 'Agar tidak ada momen yang terlewat',
        events: [
          { id: 's1', time: '08.00', title: 'Akad Nikah', description: 'Ijab kabul di kediaman mempelai wanita.', accent: 'gold', icon: 'rings' },
          { id: 's2', time: '10.30', title: 'Arak-arakan Pengantin', description: 'Mempelai diarak di bawah payung pengantin.', accent: 'coral', icon: 'door' },
          { id: 's3', time: '11.00', title: 'Penyambutan Tamu', description: 'Tari penyambutan dan persembahan tepak sirih.', accent: 'emerald', icon: 'music' },
          { id: 's4', time: '11.30', title: 'Munggah & Bersanding', description: 'Kedua mempelai bersanding di pelaminan.', accent: 'gold', icon: 'sparkle' },
          { id: 's5', time: '12.30', title: 'Jamuan', description: 'Ramah tamah dan santap siang bersama.', accent: 'sky', icon: 'plate' },
          { id: 's6', time: '14.00', title: 'Sesi Foto', description: 'Foto bersama keluarga dan kerabat.', accent: 'purple', icon: 'camera' },
        ],
      },
    },

    {
      id: 'rsvp',
      type: 'rsvp',
      enabled: true,
      props: {
        title: 'Sudikah Hadir?',
        subtitle: `Mohon konfirmasi sebelum 1 Desember ${targetYear}`,
      },
    },

    {
      id: 'weddingGift',
      type: 'weddingGift',
      enabled: true,
      navLabel: 'Hadiah',
      props: {
        title: 'Tanda Kasih',
        subtitle: 'Doa restu Anda adalah hadiah terindah',
        intro:
          'Kehadiran dan doa restu Anda sudah sangat berarti. Bila berkenan memberikan tanda kasih, silakan melalui pilihan berikut.',
        confirmationEnabled: true,
        accounts: [
          { id: 'bsi-ayu', type: 'bank', name: 'BSI', accountNumber: '7123456789', accountHolder: 'Ayu Lestari', accent: 'coral' },
          { id: 'bca-rizky', type: 'bank', name: 'BCA', accountNumber: '0987654321', accountHolder: 'Muhammad Rizky', accent: 'gold' },
        ],
        giftAddress: 'Kado fisik dapat dikirim ke kediaman mempelai wanita di Palembang.',
      },
    },

    {
      id: 'footer',
      type: 'footer',
      enabled: true,
      props: {
        monogram: 'A & R',
        hashtag: '#AyuRizkyBersanding',
        message: 'Terima kasih atas doa dan restunya. Wong Kito Galo.',
        coupleName: 'Ayu & Rizky',
        photos: [
          { src: BRIDE_SILHOUETTE, alt: 'Ayu' },
          { src: GROOM_SILHOUETTE, alt: 'Rizky' },
        ],
        socials: [
          { id: 's-ig', label: 'Instagram', url: '#' },
        ],
      },
    },
  ],
}

export default defaultConfig
