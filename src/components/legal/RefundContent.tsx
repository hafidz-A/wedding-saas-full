import { BRAND } from '@/lib/brand'
import type { Lang } from '@/lib/i18n/config'

/**
 * Kebijakan Pengembalian Dana / Refund Policy — body content only (no page
 * chrome).
 *
 * Bilingual: renders the Indonesian original (transcribed from the
 * user-supplied "refund policy.docx") or its English counterpart based on
 * the `lang` prop. Shared by the standalone /refund route (wrapped in
 * LegalLayout) and the consent modal on /signup (wrapped in LegalModal).
 * Pure presentational JSX — safe to render from both Server (page) and
 * Client (modal) components.
 *
 * The [email] and contact-row placeholders are intentional — fill them
 * before publishing.
 */
export default function RefundContent({ lang = 'id' }: { lang?: Lang }) {
  return lang === 'en' ? <RefundEn /> : <RefundId />
}

function RefundId() {
  return (
    <>
      <h2>1. Ketentuan Umum</h2>
      <p>Layanan yang disediakan oleh {BRAND} merupakan produk dan layanan digital berupa pembelian serta penggunaan template undangan digital yang dapat langsung diakses dan digunakan setelah pembayaran berhasil dilakukan.</p>
      <p>Dengan melakukan pembayaran, Pengguna memahami dan menyetujui bahwa produk digital memiliki karakteristik berbeda dengan barang fisik sehingga pengembalian dana hanya dapat dilakukan dalam kondisi tertentu sebagaimana diatur dalam Kebijakan Pengembalian Dana ini.</p>

      <h2>2. Kondisi yang Berhak Mendapatkan Pengembalian Dana</h2>
      <p>Pengguna dapat mengajukan pengembalian dana apabila terjadi salah satu kondisi berikut:</p>
      <ul>
        <li><strong>Pembayaran Ganda.</strong> Pengguna melakukan pembayaran lebih dari satu kali untuk pesanan yang sama akibat kesalahan sistem atau proses pembayaran.</li>
        <li><strong>Kegagalan Sistem {BRAND}.</strong> Layanan tidak dapat digunakan karena gangguan atau kesalahan sistem yang berasal dari pihak {BRAND} dan gangguan tersebut tidak dapat diperbaiki dalam waktu yang wajar setelah dilaporkan oleh Pengguna.</li>
        <li><strong>Pesanan Tidak Dapat Diakses.</strong> Template atau layanan yang telah dibeli tidak dapat diakses oleh Pengguna meskipun pembayaran telah berhasil diverifikasi dan kondisi tersebut tidak disebabkan oleh kesalahan Pengguna.</li>
      </ul>

      <h2>3. Kondisi yang Tidak Berhak Mendapatkan Pengembalian Dana</h2>
      <p>Pengembalian dana tidak dapat diberikan dalam keadaan sebagai berikut:</p>
      <ul>
        <li><strong>Template Telah Digunakan.</strong> Pengguna telah mengakses, mengisi, mengedit, mengunggah konten, membagikan, atau menggunakan template undangan yang telah dibeli.</li>
        <li><strong>Perubahan atau Pembatalan Acara.</strong> Perubahan jadwal acara, pembatalan acara, perubahan konsep acara, atau alasan pribadi lainnya yang berasal dari Pengguna.</li>
        <li><strong>Kesalahan Pengguna.</strong> Kesalahan dalam memasukkan data, memilih template, melakukan pembelian, mengunggah konten, atau tindakan lain yang dilakukan oleh Pengguna.</li>
        <li>
          <strong>Gangguan di Luar Kendali {BRAND}.</strong> Gangguan yang disebabkan oleh:
          <ul>
            <li>koneksi internet pengguna;</li>
            <li>perangkat pengguna;</li>
            <li>browser atau aplikasi pihak ketiga;</li>
            <li>keadaan kahar; atau</li>
            <li>faktor lain di luar kendali wajar {BRAND}.</li>
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
        <li>Setiap permohonan pengembalian dana akan diperiksa dan diverifikasi oleh {BRAND}.</li>
        <li>{BRAND} berhak meminta dokumen atau informasi tambahan yang diperlukan untuk proses verifikasi.</li>
        <li>Keputusan atas permohonan pengembalian dana sepenuhnya berada pada kewenangan {BRAND} berdasarkan hasil pemeriksaan terhadap data dan kondisi yang terjadi.</li>
        <li>Keputusan yang telah diberikan akan disampaikan kepada Pengguna melalui email atau sarana komunikasi lainnya.</li>
      </ul>

      <h2>6. Proses Pengembalian Dana</h2>
      <p>Apabila permohonan pengembalian dana disetujui:</p>
      <ul>
        <li>Pengembalian dana akan dilakukan melalui metode pembayaran yang memungkinkan sesuai kebijakan penyedia pembayaran yang digunakan.</li>
        <li>Apabila pengembalian ke metode pembayaran asal tidak memungkinkan, {BRAND} dapat menentukan metode pengembalian dana lainnya yang dianggap wajar.</li>
        <li>Waktu penerimaan dana bergantung pada kebijakan bank, penyedia pembayaran, atau lembaga keuangan terkait.</li>
      </ul>

      <h2>7. Penyalahgunaan Kebijakan Pengembalian Dana</h2>
      <p>{BRAND} berhak menolak permohonan pengembalian dana apabila ditemukan indikasi penyalahgunaan layanan, kecurangan, manipulasi transaksi, pemberian informasi yang tidak benar, atau tindakan lain yang merugikan {BRAND}.</p>

      <h2>8. Perubahan Kebijakan</h2>
      <p>{BRAND} berhak mengubah atau memperbarui Kebijakan Pengembalian Dana ini sewaktu-waktu. Setiap perubahan akan diumumkan melalui situs web atau media komunikasi resmi {BRAND} dan berlaku sejak tanggal yang ditetapkan.</p>

      <h2>9. Hubungi {BRAND}</h2>
      <p>Untuk informasi lebih lanjut, Pengguna dapat menghubungi {BRAND} melalui:</p>
      <ul>
        <li>WhatsApp: <code>[…]</code></li>
        <li>Telepon: <code>[…]</code></li>
        <li>Email: <code>[…]</code></li>
      </ul>
    </>
  )
}

function RefundEn() {
  return (
    <>
      <h2>1. General Provisions</h2>
      <p>The services provided by {BRAND} are digital products and services — the purchase and use of digital invitation templates that can be accessed and used immediately once payment has been completed.</p>
      <p>By making a payment, the User understands and agrees that digital products differ in nature from physical goods, and that refunds are therefore available only under the specific circumstances set out in this Refund Policy.</p>

      <h2>2. Circumstances Eligible for a Refund</h2>
      <p>The User may request a refund if any of the following occurs:</p>
      <ul>
        <li><strong>Duplicate Payment.</strong> The User was charged more than once for the same order due to a system or payment-processing error.</li>
        <li><strong>{BRAND} System Failure.</strong> The service cannot be used because of a fault or system error originating from {BRAND}, and the fault cannot be remedied within a reasonable time after being reported by the User.</li>
        <li><strong>Order Inaccessible.</strong> The purchased template or service cannot be accessed by the User even though payment has been successfully verified, and the situation was not caused by the User&rsquo;s own error.</li>
      </ul>

      <h2>3. Circumstances Not Eligible for a Refund</h2>
      <p>Refunds will not be granted in the following circumstances:</p>
      <ul>
        <li><strong>Template Already Used.</strong> The User has accessed, filled in, edited, uploaded content to, shared, or otherwise used the purchased invitation template.</li>
        <li><strong>Event Changes or Cancellation.</strong> Changes to the event schedule, cancellation of the event, changes to the event concept, or other personal reasons on the User&rsquo;s side.</li>
        <li><strong>User Error.</strong> Mistakes in entering data, choosing a template, completing a purchase, uploading content, or any other action taken by the User.</li>
        <li>
          <strong>Disruptions Beyond {BRAND}&rsquo;s Control.</strong> Disruptions caused by:
          <ul>
            <li>the user&rsquo;s internet connection;</li>
            <li>the user&rsquo;s device;</li>
            <li>third-party browsers or applications;</li>
            <li>force majeure; or</li>
            <li>other factors beyond {BRAND}&rsquo;s reasonable control.</li>
          </ul>
        </li>
        <li><strong>Expiry of the Active Period.</strong> The expiry of the service&rsquo;s active period under the purchased plan is not grounds for a refund.</li>
      </ul>

      <h2>4. How to Request a Refund</h2>
      <p>Refund requests may be submitted by email to [email] and must include the following information:</p>
      <ul>
        <li>account name;</li>
        <li>registered email address;</li>
        <li>transaction number or ID;</li>
        <li>proof of payment;</li>
        <li>the reason for the refund request; and</li>
        <li>any other supporting information, if required.</li>
      </ul>

      <h2>5. Review Process</h2>
      <ul>
        <li>Every refund request will be examined and verified by {BRAND}.</li>
        <li>{BRAND} may request additional documents or information needed for verification.</li>
        <li>The decision on a refund request rests entirely with {BRAND}, based on its review of the relevant data and circumstances.</li>
        <li>The decision will be communicated to the User by email or another means of communication.</li>
      </ul>

      <h2>6. Refund Process</h2>
      <p>If a refund request is approved:</p>
      <ul>
        <li>The refund will be issued through whichever payment method is feasible under the policies of the payment provider used.</li>
        <li>If a refund to the original payment method is not possible, {BRAND} may determine another reasonable means of refunding the User.</li>
        <li>The time it takes to receive the funds depends on the policies of the relevant bank, payment provider, or financial institution.</li>
      </ul>

      <h2>7. Abuse of the Refund Policy</h2>
      <p>{BRAND} reserves the right to reject a refund request where there is any indication of service misuse, fraud, transaction manipulation, false information, or any other conduct detrimental to {BRAND}.</p>

      <h2>8. Changes to this Policy</h2>
      <p>{BRAND} may amend or update this Refund Policy at any time. Any changes will be announced through the website or {BRAND}&rsquo;s official communication channels and take effect from the stated date.</p>

      <h2>9. Contact {BRAND}</h2>
      <p>For further information, the User may contact {BRAND} via:</p>
      <ul>
        <li>WhatsApp: <code>[…]</code></li>
        <li>Phone: <code>[…]</code></li>
        <li>Email: <code>[…]</code></li>
      </ul>
    </>
  )
}
