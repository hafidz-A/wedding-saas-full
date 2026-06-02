import LegalLayout from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Kebijakan Pengembalian Dana',
  description: 'Kebijakan pengembalian dana (refund) & masa aktif.',
}

export default function RefundPage() {
  return (
    <LegalLayout
      title="Kebijakan Pengembalian Dana"
      updated="[TANGGAL]"
      draftNote="DRAF — sesuaikan dengan model bisnis Anda & minta peninjauan hukum sebelum dipublikasikan."
    >
      <h2>1. Prinsip Umum</h2>
      <p>Layanan bersifat <strong>produk digital</strong> yang langsung tersedia setelah pembayaran. Karena itu, pengembalian dana bersifat terbatas seperti diatur di bawah.</p>

      <h2>2. Berhak Refund</h2>
      <ul>
        <li><strong>Gagal teknis dari pihak kami</strong> yang membuat undangan tidak dapat ditayangkan dan tidak dapat kami perbaiki dalam <code>[X]×24 jam</code>.</li>
        <li><strong>Pembayaran ganda</strong> (double charge) untuk pesanan yang sama.</li>
        <li><strong>Pembatalan dalam <code>[X] jam</code></strong> setelah pembayaran selama undangan belum diisi/dibagikan.</li>
      </ul>

      <h2>3. Tidak Berhak Refund</h2>
      <ul>
        <li>Undangan sudah ditayangkan/dibagikan ke tamu.</li>
        <li>Perubahan rencana acara di pihak Anda (pernikahan ditunda/batal).</li>
        <li>Kesalahan pengisian konten oleh Pengguna.</li>
        <li>Masa aktif telah berakhir secara normal.</li>
      </ul>

      <h2>4. Cara Mengajukan</h2>
      <p>Kirim email ke <code>[EMAIL]</code> dengan: ID undangan/slug, bukti pembayaran (ID transaksi Xendit), dan alasan. Kami tanggapi dalam <code>[X] hari kerja</code>.</p>

      <h2>5. Proses & Waktu</h2>
      <p>Refund yang disetujui diproses melalui Xendit ke metode pembayaran asal. Waktu sampai dana diterima bergantung pada bank/penyedia (umumnya <code>[X–Y] hari kerja</code>).</p>

      <h2>6. Masa Aktif & Nasib Data Setelah Berakhir</h2>
      <ul>
        <li>Saat masa aktif berakhir, undangan <strong>nonaktif otomatis</strong> dan tidak dapat diakses tamu.</li>
        <li>Data RSVP/ucapan/hadiah tetap dapat Anda unduh hingga <code>[X HARI]</code> setelah berakhir, sebelum berpotensi dihapus.</li>
        <li>Perpanjangan tersedia melalui tombol perpanjang di dasbor/profil.</li>
      </ul>

      <h2>7. Kontak</h2>
      <p><code>[NAMA USAHA]</code> — <code>[EMAIL]</code>.</p>
    </LegalLayout>
  )
}
