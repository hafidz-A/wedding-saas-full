/* Songket default/demo config — plain data only (server-safe; templateIndex
   imports it). Section types and prop names deliberately mirror Lovebirds so the
   shared editor schemas and the gift-account encryption apply unchanged.

   ⚠️ Adat wording (tahapan, salam) is a draft pending review by a Palembang
   adat source — see docs/superpowers/specs/2026-10-12-template-adat-palembang-design.md. */

import { demoImg } from '../../lib/demoImages.js'

// Always a future date so the demo countdown keeps running.
const now = new Date()
const targetYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear()
const weddingDate = `${targetYear}-12-12T09:00:00`
const dateText = `Sabtu, 12 Desember ${targetYear}`

export const defaultConfig = {
  couple: { name1: 'Ayu', name2: 'Rizky' },
  meta: {
    title: 'Ayu & Rizky — Undangan Pernikahan',
    description: 'Undangan pernikahan adat Palembang',
  },
  theme: { defaultPalette: 'merahLak', ornamentType: 'melati' },

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
        weddingDate,
        venue: 'Palembang, Sumatera Selatan',
        eyebrow: 'Undangan Pernikahan',
        welcomeText: 'Kepada Yth. Bapak/Ibu/Saudara/i',
        openLabel: 'Buka Undangan',
        countdownEnabled: true,
      },
    },
    {
      id: 'quote',
      type: 'quote',
      enabled: true,
      props: {
        greeting: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
        intro:
          'Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami.',
        text:
          'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
        attribution: 'QS Ar-Rum: 21',
      },
    },
    {
      id: 'brideGroom',
      type: 'brideGroom',
      enabled: true,
      props: {
        title: 'Dua Keluarga, Satu Ikatan',
        portraitStyle: 'siluet',
        people: [
          {
            role: 'Mempelai Wanita',
            name: 'Ayu Lestari',
            photo: '',
            parents: 'Putri dari Bapak H. Ahmad Syarif & Ibu Hj. Fatimah',
            instagram: '',
            direction: 'right',
          },
          {
            role: 'Mempelai Pria',
            name: 'Muhammad Rizky',
            photo: '',
            parents: 'Putra dari Bapak H. Hasan Basri & Ibu Hj. Aminah',
            instagram: '',
            direction: 'left',
          },
        ],
      },
    },
    {
      id: 'ourStory',
      type: 'ourStory',
      enabled: true,
      props: {
        title: 'Menuju Hari Bahagia',
        showImages: false,
        stories: [
          { id: 'madik', year: 'Madik', title: 'Saling Mengenal', description: 'Keluarga mempelai pria berkenalan dan menjajaki keluarga mempelai wanita.', image: '' },
          { id: 'ngebet', year: 'Ngebet', title: 'Tanda Ikatan', description: 'Tanda pengikat diantarkan sebagai janji kedua keluarga.', image: '' },
          { id: 'berasan', year: 'Berasan', title: 'Musyawarah Keluarga', description: 'Dua keluarga bermusyawarah menentukan hari baik dan persiapan pernikahan.', image: '' },
          { id: 'belanjo', year: 'Nganterke Belanjo', title: 'Mengantar Seserahan', description: 'Keluarga mempelai pria mengantarkan seserahan dan belanjo dalam tenong.', image: '' },
          { id: 'munggah', year: dateText, title: 'Akad & Munggah', description: 'Akad nikah, lalu kedua mempelai bersanding dalam busana Aesan Gede.', image: '' },
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
          { id: 'akad', label: 'Akad Nikah', icon: 'akad', date: dateText, time: '08.00 — 10.00 WIB', location: 'Kediaman Mempelai Wanita, Palembang' },
          { id: 'resepsi', label: 'Resepsi (Munggah)', icon: 'resepsi', date: dateText, time: '11.00 — 15.00 WIB', location: 'Balai Pertemuan, Palembang' },
        ],
        mapEmbed: 'https://www.google.com/maps?q=-2.9917,104.7633&z=14&output=embed',
        mapUrl: 'https://maps.google.com/?q=-2.9917,104.7633',
      },
    },
    {
      id: 'schedule',
      type: 'schedule',
      enabled: true,
      props: {
        title: 'Rangkaian Acara',
        events: [
          { id: 's1', time: '08.00', title: 'Akad Nikah', description: 'Ijab kabul di kediaman mempelai wanita.' },
          { id: 's2', time: '10.30', title: 'Arak-arakan Pengantin', description: 'Mempelai diarak di bawah payung pengantin.' },
          { id: 's3', time: '11.00', title: 'Penyambutan Tamu', description: 'Tari penyambutan dan persembahan tepak sirih.' },
          { id: 's4', time: '11.30', title: 'Munggah & Bersanding', description: 'Kedua mempelai bersanding di pelaminan.' },
          { id: 's5', time: '12.30', title: 'Jamuan', description: 'Ramah tamah dan santap siang bersama.' },
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
        photos: [
          { src: demoImg('coupleClassic', 600), alt: 'Kami berdua' },
          { src: demoImg('galleryRings', 600), alt: 'Cincin' },
          { src: demoImg('gallerySunsetWalk', 600), alt: 'Senja' },
          { src: demoImg('galleryFamilyDinner', 600), alt: 'Bersama keluarga' },
          { src: demoImg('coupleCasual', 600), alt: 'Santai' },
          { src: demoImg('galleryCoffee', 600), alt: 'Pagi hari' },
        ],
      },
    },
    {
      id: 'weddingGift',
      type: 'weddingGift',
      enabled: true,
      navLabel: 'Hadiah',
      props: {
        title: 'Hadiah Pernikahan',
        intro:
          'Doa restu Anda adalah hadiah terindah bagi kami. Bila berkenan memberikan tanda kasih, silakan melalui pilihan berikut.',
        confirmationEnabled: true,
        accounts: [
          { id: 'bsi-ayu', type: 'bank', name: 'BSI', accountNumber: '7123456789', accountHolder: 'Ayu Lestari', accent: 'gold' },
          { id: 'bca-rizky', type: 'bank', name: 'BCA', accountNumber: '0987654321', accountHolder: 'Muhammad Rizky', accent: 'gold' },
        ],
        giftAddress: 'Kado fisik dapat dikirim ke kediaman mempelai wanita di Palembang.',
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
      id: 'footer',
      type: 'footer',
      enabled: true,
      props: {
        coupleName: 'Ayu & Rizky',
        hashtag: '#AyuRizkyBersanding',
        motto: 'Wong Kito Galo',
      },
    },
  ],
}

export default defaultConfig
