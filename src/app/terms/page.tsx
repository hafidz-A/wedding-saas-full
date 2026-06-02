import LegalLayout from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan layanan undangan pernikahan digital.',
}

export default function TermsPage() {
  return (
    <LegalLayout
      title="Syarat & Ketentuan"
      updated="[TANGGAL]"
      draftNote="DRAF — ganti placeholder [.​..] dengan data badan usaha Anda dan minta peninjauan penasihat hukum sebelum dipublikasikan."
    >
      <h2>1. Definisi</h2>
      <ul>
        <li><strong>"Layanan"</strong> — platform pembuatan & penayangan undangan pernikahan digital di <code>[DOMAIN]</code>.</li>
        <li><strong>"Penyedia"/"Kami"</strong> — <code>[NAMA USAHA]</code>, <code>[ALAMAT]</code>, <code>[EMAIL]</code>.</li>
        <li><strong>"Pengguna"/"Anda"</strong> — pihak yang membuat akun dan memesan undangan.</li>
        <li><strong>"Tamu"</strong> — pihak yang mengakses undangan untuk RSVP, ucapan, atau konfirmasi hadiah.</li>
      </ul>

      <h2>2. Lingkup Layanan</h2>
      <p>Kami menyediakan templat undangan yang dapat Anda isi dengan data acara, lalu ditayangkan pada alamat unik (<code>[domain]/&lt;templat&gt;/&lt;slug&gt;</code>) selama masa aktif yang Anda beli.</p>

      <h2>3. Akun & Tanggung Jawab Pengguna</h2>
      <ul>
        <li>Anda bertanggung jawab atas kerahasiaan kredensial akun.</li>
        <li>Anda menjamin memiliki hak/izin atas seluruh konten yang diunggah (foto, nama, teks, musik).</li>
        <li>Dilarang mengunggah konten melanggar hukum, melanggar hak pihak ketiga, atau mengandung malware.</li>
        <li>Anda bertanggung jawab memperoleh persetujuan Tamu atas pencantuman data mereka jika Anda yang memasukkannya.</li>
      </ul>

      <h2>4. Pembayaran & Masa Aktif</h2>
      <ul>
        <li>Harga setiap paket tertera saat checkout dan dapat berubah untuk pesanan baru.</li>
        <li>Pembayaran diproses oleh <strong>Xendit</strong> (gerbang pembayaran pihak ketiga). Kami tidak menyimpan data kartu/instrumen pembayaran Anda.</li>
        <li>Undangan baru ditayangkan setelah pembayaran terkonfirmasi.</li>
        <li>Paket dengan masa aktif tertentu nonaktif otomatis saat masa aktif berakhir (lihat §7 & Kebijakan Pengembalian Dana).</li>
      </ul>

      <h2>5. Ketersediaan Layanan</h2>
      <p>Kami berupaya menjaga Layanan tetap tersedia, namun tidak menjamin tanpa gangguan. Kami tidak bertanggung jawab atas kerugian akibat hal di luar kendali wajar kami (force majeure, kegagalan penyedia hosting/pembayaran pihak ketiga).</p>

      <h2>6. Kekayaan Intelektual</h2>
      <p>Desain templat, kode, dan elemen visual Layanan adalah milik Kami. Anda memperoleh lisensi terbatas, non-eksklusif, untuk menggunakan undangan selama masa aktif. Konten yang Anda unggah tetap milik Anda; Anda memberi Kami lisensi terbatas untuk menyimpan dan menampilkannya demi menjalankan Layanan.</p>

      <h2>7. Data & Privasi</h2>
      <p>Pemrosesan data pribadi diatur dalam <a href="/privacy">Kebijakan Privasi</a>, bagian tak terpisahkan dari Syarat ini, dan tunduk pada UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>

      <h2>8. Pembatasan Tanggung Jawab</h2>
      <p>Sejauh diizinkan hukum, tanggung jawab Kami atas klaim apa pun dibatasi maksimum sebesar biaya yang Anda bayarkan untuk undangan terkait dalam 12 bulan terakhir.</p>

      <h2>9. Penghentian</h2>
      <p>Kami dapat menangguhkan/menghentikan akun yang melanggar Syarat ini. Anda dapat berhenti kapan saja; ketentuan pengembalian dana tetap berlaku.</p>

      <h2>10. Perubahan Syarat</h2>
      <p>Kami dapat memperbarui Syarat ini. Perubahan berlaku sejak dipublikasikan di halaman ini. Penggunaan berkelanjutan berarti Anda menyetujui versi terbaru.</p>

      <h2>11. Hukum yang Berlaku & Penyelesaian Sengketa</h2>
      <p>Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah; bila gagal, melalui <code>[PENGADILAN/ARBITRASE]</code>.</p>

      <h2>12. Kontak</h2>
      <p><code>[NAMA USAHA]</code> — <code>[EMAIL]</code> — <code>[NOMOR/ALAMAT]</code>.</p>
    </LegalLayout>
  )
}
