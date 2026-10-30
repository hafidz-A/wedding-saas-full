/* ============================================================
   musi/config/limasTour.js — the house tour's little cards.

   One card per room of the Rumah Limas, in the order the camera walks in
   (windows in config/timeline.js HOUSE_TOUR). They explain the house's adat,
   so they are the template's own copy, the same for every couple; only
   `{names}` takes the couple's names. Details differ from house to house
   (how many steps, who sits where), so the wording stays general.
   Plain data.
   ============================================================ */

export const LIMAS_TOUR = [
  {
    key: 'garang',
    title: 'Garang',
    body: 'Teras depan berpagar kayu berukir, dicapai lewat dua tangga di kiri dan kanan. Rumahnya berdiri di atas tiang; kolongnya dulu tempat menyimpan perahu.',
  },
  {
    key: 'lawangKipas',
    title: 'Lawang Kipas',
    body: 'Dinding depan bisa dilipat ke atas dan ditopang seperti kipas. Saat hajatan, rumah dibuka lebar menjadi satu aula besar.',
  },
  {
    key: 'kekijing',
    title: 'Kekijing',
    body: 'Lantai berundak, makin ke dalam makin tinggi. Undakan bawah untuk tamu umum dan anak muda, makin ke atas untuk tetua dan alim ulama. Semua duduk lesehan.',
  },
  {
    key: 'gegajah',
    title: 'Gegajah',
    body: 'Ruang utama di lantai tertinggi. Ukiran prada merah, hitam, dan emas, lemari ukir berisi keramik dan songket, tepak sirih untuk menyambut tamu, dan amben tempat tetua duduk.',
  },
  {
    key: 'pangkeng',
    title: 'Pangkeng',
    body: 'Bilik tidur keluarga di sisi kiri dan kanan ruang utama, tertutup sekat kayu berukir.',
  },
  {
    key: 'dapur',
    title: 'Dapur',
    body: 'Di belakang, lantainya turun lagi: dapur dan ruang kerja, dengan tangga belakangnya sendiri.',
  },
  {
    key: 'pelaminan',
    title: 'Pelaminan',
    body: 'Di gegajah inilah pelaminan dipasang. Hari ini untuk {names}.',
  },
]
