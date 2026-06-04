/**
 * Kebijakan Pengembalian Dana (Refund) — body content only (no page chrome).
 *
 * Transcribed from the user-supplied "refund policy.docx".
 * Shared by the standalone /refund route (wrapped in LegalLayout) and the
 * consent modal on /signup (wrapped in LegalModal). Pure presentational JSX —
 * safe to render from both Server (page) and Client (modal) components.
 *
 * Placeholders such as [NAMA APLIKASI] and [email] are intentional — fill them
 * before publishing (see the draft note on /refund).
 */
export default function RefundContent() {
  return (
    <>
      <h2>1. Ketentuan Umum</h2>
      <p>Layanan yang disediakan oleh [NAMA APLIKASI] merupakan produk dan layanan digital berupa pembelian serta penggunaan template undangan digital yang dapat langsung diakses dan digunakan setelah pembayaran berhasil dilakukan.</p>
      <p>Dengan melakukan pembayaran, Pengguna memahami dan menyetujui bahwa produk digital memiliki karakteristik berbeda dengan barang fisik sehingga pengembalian dana hanya dapat dilakukan dalam kondisi tertentu sebagaimana diatur dalam Kebijakan Pengembalian Dana ini.</p>

      <h2>2. Kondisi yang Berhak Mendapatkan Pengembalian Dana</h2>
      <p>Pengguna dapat mengajukan pengembalian dana apabila terjadi salah satu kondisi berikut:</p>
      <ul>
        <li><strong>Pembayaran Ganda.</strong> Pengguna melakukan pembayaran lebih dari satu kali untuk pesanan yang sama akibat kesalahan sistem atau proses pembayaran.</li>
        <li><strong>Kegagalan Sistem [NAMA APLIKASI].</strong> Layanan tidak dapat digunakan karena gangguan atau kesalahan sistem yang berasal dari pihak [NAMA APLIKASI] dan gangguan tersebut tidak dapat diperbaiki dalam waktu yang wajar setelah dilaporkan oleh Pengguna.</li>
        <li><strong>Pesanan Tidak Dapat Diakses.</strong> Template atau layanan yang telah dibeli tidak dapat diakses oleh Pengguna meskipun pembayaran telah berhasil diverifikasi dan kondisi tersebut tidak disebabkan oleh kesalahan Pengguna.</li>
      </ul>

      <h2>3. Kondisi yang Tidak Berhak Mendapatkan Pengembalian Dana</h2>
      <p>Pengembalian dana tidak dapat diberikan dalam keadaan sebagai berikut:</p>
      <ul>
        <li><strong>Template Telah Digunakan.</strong> Pengguna telah mengakses, mengisi, mengedit, mengunggah konten, membagikan, atau menggunakan template undangan yang telah dibeli.</li>
        <li><strong>Perubahan atau Pembatalan Acara.</strong> Perubahan jadwal acara, pembatalan acara, perubahan konsep acara, atau alasan pribadi lainnya yang berasal dari Pengguna.</li>
        <li><strong>Kesalahan Pengguna.</strong> Kesalahan dalam memasukkan data, memilih template, melakukan pembelian, mengunggah konten, atau tindakan lain yang dilakukan oleh Pengguna.</li>
        <li>
          <strong>Gangguan di Luar Kendali [NAMA APLIKASI].</strong> Gangguan yang disebabkan oleh:
          <ul>
            <li>koneksi internet pengguna;</li>
            <li>perangkat pengguna;</li>
            <li>browser atau aplikasi pihak ketiga;</li>
            <li>keadaan kahar; atau</li>
            <li>faktor lain di luar kendali wajar [NAMA APLIKASI].</li>
          </ul>
        </li>
        <li><strong>Masa Aktif Berakhir.</strong> Berakhirnya masa aktif layanan sesuai paket yang dibeli bukan merupakan alasan untuk pengembalian dana.</li>
      </ul>

      <h2>4. Cara Pengajuan Pengembalian Dana</h2>
      <p>Pengajuan pengembalian dana dapat dilakukan melalui email [email] dan Pengguna wajib menyertakan informasi berikut:</p>
      <ul>
        <li>nama akun;</li>
        <li>alamat email yang terdaftar;</li>
        <li>nomor atau ID transaksi;</li>
        <li>bukti pembayaran;</li>
        <li>alasan pengajuan pengembalian dana; dan</li>
        <li>informasi pendukung lainnya apabila diperlukan.</li>
      </ul>

      <h2>5. Proses Peninjauan</h2>
      <ul>
        <li>Setiap permohonan pengembalian dana akan diperiksa dan diverifikasi oleh [NAMA APLIKASI].</li>
        <li>[NAMA APLIKASI] berhak meminta dokumen atau informasi tambahan yang diperlukan untuk proses verifikasi.</li>
        <li>Keputusan atas permohonan pengembalian dana sepenuhnya berada pada kewenangan [NAMA APLIKASI] berdasarkan hasil pemeriksaan terhadap data dan kondisi yang terjadi.</li>
        <li>Keputusan yang telah diberikan akan disampaikan kepada Pengguna melalui email atau sarana komunikasi lainnya.</li>
      </ul>

      <h2>6. Proses Pengembalian Dana</h2>
      <p>Apabila permohonan pengembalian dana disetujui:</p>
      <ul>
        <li>Pengembalian dana akan dilakukan melalui metode pembayaran yang memungkinkan sesuai kebijakan penyedia pembayaran yang digunakan.</li>
        <li>Apabila pengembalian ke metode pembayaran asal tidak memungkinkan, [NAMA APLIKASI] dapat menentukan metode pengembalian dana lainnya yang dianggap wajar.</li>
        <li>Waktu penerimaan dana bergantung pada kebijakan bank, penyedia pembayaran, atau lembaga keuangan terkait.</li>
      </ul>

      <h2>7. Penyalahgunaan Kebijakan Pengembalian Dana</h2>
      <p>[NAMA APLIKASI] berhak menolak permohonan pengembalian dana apabila ditemukan indikasi penyalahgunaan layanan, kecurangan, manipulasi transaksi, pemberian informasi yang tidak benar, atau tindakan lain yang merugikan [NAMA APLIKASI].</p>

      <h2>8. Perubahan Kebijakan</h2>
      <p>[NAMA APLIKASI] berhak mengubah atau memperbarui Kebijakan Pengembalian Dana ini sewaktu-waktu. Setiap perubahan akan diumumkan melalui situs web atau media komunikasi resmi [NAMA APLIKASI] dan berlaku sejak tanggal yang ditetapkan.</p>

      <h2>9. Hubungi [NAMA APLIKASI]</h2>
      <p>Untuk informasi lebih lanjut, Pengguna dapat menghubungi [NAMA APLIKASI] melalui:</p>
      <ul>
        <li>WhatsApp: <code>[…]</code></li>
        <li>Telepon: <code>[…]</code></li>
        <li>Email: <code>[…]</code></li>
      </ul>
    </>
  )
}
