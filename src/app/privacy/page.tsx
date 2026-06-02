import LegalLayout from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi & pelindungan data pribadi (UU PDP).',
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Kebijakan Privasi"
      updated="[TANGGAL]"
      draftNote="DRAF — mengacu pada UU No. 27 Tahun 2022 (UU PDP). Lengkapi placeholder [.​..] dan minta peninjauan penasihat hukum sebelum dipublikasikan."
    >
      <h2>1. Pengendali Data</h2>
      <p><code>[NAMA USAHA]</code>, <code>[ALAMAT]</code>, kontak <code>[EMAIL]</code>, bertindak sebagai <strong>Pengendali Data Pribadi</strong> untuk Layanan undangan digital di <code>[DOMAIN]</code>.</p>

      <h2>2. Data yang Kami Proses</h2>
      <h3>Dari Pengguna (pemesan)</h3>
      <ul>
        <li>Identitas akun: email, kata sandi (disimpan sebagai hash, tidak pernah polos).</li>
        <li>Data acara: nama pasangan, tanggal, lokasi, dan konten yang Anda isi.</li>
        <li>Data rekening bank / e-wallet untuk fitur hadiah (<strong>dienkripsi</strong> saat disimpan).</li>
        <li>Metadata pembayaran dari Xendit (status, ID transaksi). Kami <strong>tidak</strong> menyimpan nomor kartu.</li>
      </ul>
      <h3>Dari Tamu</h3>
      <ul>
        <li>Nama, kehadiran (RSVP), pesan/ucapan, konfirmasi hadiah, nomor WhatsApp (jika diisi).</li>
        <li>Data sensitif Tamu (nama, telepon, catatan, RSVP, konfirmasi hadiah) <strong>dienkripsi</strong> saat disimpan (AES-256-GCM).</li>
      </ul>
      <h3>Teknis</h3>
      <p>Alamat IP, jenis perangkat/peramban, dan log akses untuk keamanan & pencegahan penyalahgunaan.</p>

      <h2>3. Dasar & Tujuan Pemrosesan</h2>
      <ul>
        <li><strong>Pelaksanaan kontrak:</strong> menayangkan undangan dan mengumpulkan RSVP/ucapan/hadiah.</li>
        <li><strong>Kepentingan sah:</strong> keamanan, pencegahan abuse (rate limiting), pencegahan penipuan.</li>
        <li><strong>Persetujuan:</strong> untuk data yang Anda/Tamu berikan secara sukarela.</li>
        <li><strong>Kewajiban hukum:</strong> penyimpanan catatan transaksi bila diwajibkan.</li>
      </ul>

      <h2>4. Persetujuan Tamu</h2>
      <p>Saat <strong>Anda memasukkan data Tamu</strong>, Anda menyatakan telah memperoleh izin Tamu tersebut. Saat <strong>Tamu mengisi sendiri</strong> formulir RSVP/ucapan, pengisian dianggap sebagai persetujuan pemrosesan untuk tujuan acara.</p>

      <h2>5. Pembagian Data ke Pihak Ketiga (Prosesor)</h2>
      <ul>
        <li><strong>Xendit</strong> — pemrosesan pembayaran.</li>
        <li><strong>Supabase</strong> — basis data & penyimpanan berkas.</li>
        <li><strong>Vercel</strong> — hosting aplikasi.</li>
        <li><strong>Resend</strong> — pengiriman email transaksional.</li>
      </ul>
      <p>Kami tidak menjual data pribadi. Pemrosesan oleh pihak ketiga tunduk pada kebijakan masing-masing.</p>

      <h2>6. Penyimpanan & Retensi</h2>
      <ul>
        <li>Data undangan & Tamu disimpan selama masa aktif undangan dan <code>[X HARI]</code> setelahnya, lalu dapat dihapus/dianonimkan.</li>
        <li>Catatan transaksi disimpan sesuai kewajiban hukum/akuntansi.</li>
      </ul>

      <h2>7. Keamanan</h2>
      <p>Kami menerapkan enkripsi data sensitif saat disimpan, hash kata sandi, akses basis data terbatas (service role), pembatasan laju (rate limiting), serta sesi dengan batas idle. Tidak ada sistem yang 100% aman; kami berupaya secara wajar melindungi data Anda.</p>

      <h2>8. Hak Subjek Data</h2>
      <p>Sesuai UU PDP, Anda berhak: mengakses, memperbaiki, menghapus, menarik persetujuan, membatasi/menolak pemrosesan, dan memperoleh salinan data. Ajukan ke <code>[EMAIL PRIVASI]</code>; kami merespons dalam waktu wajar sesuai ketentuan.</p>

      <h2>9. Insiden Data</h2>
      <p>Bila terjadi kebocoran yang berisiko terhadap subjek data, kami akan memberitahukan pihak terdampak dan otoritas terkait sesuai ketentuan UU PDP.</p>

      <h2>10. Anak di Bawah Umur</h2>
      <p>Layanan tidak ditujukan untuk pengguna di bawah <code>[UMUR]</code> tahun.</p>

      <h2>11. Perubahan Kebijakan</h2>
      <p>Kebijakan dapat diperbarui; versi terbaru berlaku sejak dipublikasikan.</p>

      <h2>12. Kontak Pelindungan Data</h2>
      <p><code>[NAMA/EMAIL KONTAK PDP]</code>.</p>
    </LegalLayout>
  )
}
