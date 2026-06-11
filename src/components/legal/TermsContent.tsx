import { BRAND } from '@/lib/brand'
import type { Lang } from '@/lib/i18n/config'

/**
 * Syarat & Ketentuan / Terms & Conditions — body content only (no page
 * chrome). Bilingual: renders Indonesian or English based on the `lang`
 * prop. Rendered by the standalone /terms route (wrapped in LegalLayout).
 *
 * Remaining placeholders ([DOMAIN], [ALAMAT], [EMAIL], …) are intentional —
 * fill them with the business entity's details before publishing.
 */
export default function TermsContent({ lang = 'id' }: { lang?: Lang }) {
  return lang === 'en' ? <TermsEn /> : <TermsId />
}

function TermsId() {
  return (
    <>
      <h2>1. Definisi</h2>
      <ul>
        <li><strong>&ldquo;Layanan&rdquo;</strong> — platform pembuatan &amp; penayangan undangan pernikahan digital di <code>[DOMAIN]</code>.</li>
        <li><strong>&ldquo;Penyedia&rdquo;/&ldquo;Kami&rdquo;</strong> — {BRAND}, <code>[ALAMAT]</code>, <code>[EMAIL]</code>.</li>
        <li><strong>&ldquo;Pengguna&rdquo;/&ldquo;Anda&rdquo;</strong> — pihak yang membuat akun dan memesan undangan.</li>
        <li><strong>&ldquo;Tamu&rdquo;</strong> — pihak yang mengakses undangan untuk RSVP, ucapan, atau konfirmasi hadiah.</li>
      </ul>

      <h2>2. Lingkup Layanan</h2>
      <p>Kami menyediakan templat undangan yang dapat Anda isi dengan data acara, lalu ditayangkan pada alamat unik (<code>[domain]/&lt;templat&gt;/&lt;slug&gt;</code>) selama masa aktif yang Anda beli.</p>

      <h2>3. Akun &amp; Tanggung Jawab Pengguna</h2>
      <ul>
        <li>Anda bertanggung jawab atas kerahasiaan kredensial akun.</li>
        <li>Anda menjamin memiliki hak/izin atas seluruh konten yang diunggah (foto, nama, teks, musik).</li>
        <li>Dilarang mengunggah konten melanggar hukum, melanggar hak pihak ketiga, atau mengandung malware.</li>
        <li>Anda bertanggung jawab memperoleh persetujuan Tamu atas pencantuman data mereka jika Anda yang memasukkannya.</li>
      </ul>

      <h2>4. Pembayaran &amp; Masa Aktif</h2>
      <ul>
        <li>Harga setiap paket tertera saat checkout dan dapat berubah untuk pesanan baru.</li>
        <li>Pembayaran diproses oleh <strong>Xendit</strong> (gerbang pembayaran pihak ketiga). Kami tidak menyimpan data kartu/instrumen pembayaran Anda.</li>
        <li>Undangan baru ditayangkan setelah pembayaran terkonfirmasi.</li>
        <li>Paket dengan masa aktif tertentu nonaktif otomatis saat masa aktif berakhir (lihat §7 &amp; Kebijakan Pengembalian Dana).</li>
      </ul>

      <h2>5. Ketersediaan Layanan</h2>
      <p>Kami berupaya menjaga Layanan tetap tersedia, namun tidak menjamin tanpa gangguan. Kami tidak bertanggung jawab atas kerugian akibat hal di luar kendali wajar kami (force majeure, kegagalan penyedia hosting/pembayaran pihak ketiga).</p>

      <h2>6. Kekayaan Intelektual</h2>
      <p>Desain templat, kode, dan elemen visual Layanan adalah milik Kami. Anda memperoleh lisensi terbatas, non-eksklusif, untuk menggunakan undangan selama masa aktif. Konten yang Anda unggah tetap milik Anda; Anda memberi Kami lisensi terbatas untuk menyimpan dan menampilkannya demi menjalankan Layanan.</p>

      <h2>7. Data &amp; Privasi</h2>
      <p>Pemrosesan data pribadi diatur dalam <a href="/privacy">Kebijakan Privasi</a>, bagian tak terpisahkan dari Syarat ini, dan tunduk pada UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>

      <h2>8. Pembatasan Tanggung Jawab</h2>
      <p>Sejauh diizinkan hukum, tanggung jawab Kami atas klaim apa pun dibatasi maksimum sebesar biaya yang Anda bayarkan untuk undangan terkait dalam 12 bulan terakhir.</p>

      <h2>9. Penghentian</h2>
      <p>Kami dapat menangguhkan/menghentikan akun yang melanggar Syarat ini. Anda dapat berhenti kapan saja; ketentuan pengembalian dana tetap berlaku.</p>

      <h2>10. Perubahan Syarat</h2>
      <p>Kami dapat memperbarui Syarat ini. Perubahan berlaku sejak dipublikasikan di halaman ini. Penggunaan berkelanjutan berarti Anda menyetujui versi terbaru.</p>

      <h2>11. Hukum yang Berlaku &amp; Penyelesaian Sengketa</h2>
      <p>Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah; bila gagal, melalui <code>[PENGADILAN/ARBITRASE]</code>.</p>

      <h2>12. Kontak</h2>
      <p>{BRAND} — <code>[EMAIL]</code> — <code>[NOMOR/ALAMAT]</code>.</p>
    </>
  )
}

function TermsEn() {
  return (
    <>
      <h2>1. Definitions</h2>
      <ul>
        <li><strong>&ldquo;Service&rdquo;</strong> — the platform for creating &amp; publishing digital wedding invitations at <code>[DOMAIN]</code>.</li>
        <li><strong>&ldquo;Provider&rdquo;/&ldquo;We&rdquo;/&ldquo;Us&rdquo;</strong> — {BRAND}, <code>[ALAMAT]</code>, <code>[EMAIL]</code>.</li>
        <li><strong>&ldquo;User&rdquo;/&ldquo;You&rdquo;</strong> — the party who creates an account and orders an invitation.</li>
        <li><strong>&ldquo;Guest&rdquo;</strong> — a party who accesses an invitation to RSVP, leave well-wishes, or confirm a gift.</li>
      </ul>

      <h2>2. Scope of the Service</h2>
      <p>We provide invitation templates that you fill in with your event details, published at a unique address (<code>[domain]/&lt;template&gt;/&lt;slug&gt;</code>) for the active period you purchase.</p>

      <h2>3. Accounts &amp; User Responsibilities</h2>
      <ul>
        <li>You are responsible for keeping your account credentials confidential.</li>
        <li>You warrant that you hold the rights/permissions to all content you upload (photos, names, text, music).</li>
        <li>Uploading content that is unlawful, infringes third-party rights, or contains malware is prohibited.</li>
        <li>Where you enter Guests&rsquo; details yourself, you are responsible for obtaining their consent to be included.</li>
      </ul>

      <h2>4. Payments &amp; Active Period</h2>
      <ul>
        <li>The price of each plan is shown at checkout and may change for new orders.</li>
        <li>Payments are processed by <strong>Xendit</strong> (a third-party payment gateway). We do not store your card or payment-instrument details.</li>
        <li>A new invitation goes live once payment is confirmed.</li>
        <li>Plans with a fixed active period are deactivated automatically when that period ends (see §7 &amp; the Refund Policy).</li>
      </ul>

      <h2>5. Service Availability</h2>
      <p>We strive to keep the Service available but do not guarantee uninterrupted operation. We are not liable for losses caused by events beyond our reasonable control (force majeure, failures of third-party hosting or payment providers).</p>

      <h2>6. Intellectual Property</h2>
      <p>The template designs, code, and visual elements of the Service belong to Us. You receive a limited, non-exclusive licence to use your invitation for its active period. Content you upload remains yours; you grant Us a limited licence to store and display it for the purpose of operating the Service.</p>

      <h2>7. Data &amp; Privacy</h2>
      <p>The processing of personal data is governed by the <a href="/privacy">Privacy Policy</a>, which forms an integral part of these Terms and is subject to Law No. 27 of 2022 on Personal Data Protection.</p>

      <h2>8. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Our liability for any claim is capped at the amount you paid for the invitation concerned in the preceding 12 months.</p>

      <h2>9. Termination</h2>
      <p>We may suspend or terminate accounts that breach these Terms. You may stop using the Service at any time; the refund provisions continue to apply.</p>

      <h2>10. Changes to these Terms</h2>
      <p>We may update these Terms. Changes take effect once published on this page. Continued use of the Service constitutes acceptance of the latest version.</p>

      <h2>11. Governing Law &amp; Dispute Resolution</h2>
      <p>These Terms are governed by the laws of the Republic of Indonesia. Disputes are to be settled amicably; failing that, through <code>[PENGADILAN/ARBITRASE]</code>.</p>

      <h2>12. Contact</h2>
      <p>{BRAND} — <code>[EMAIL]</code> — <code>[NOMOR/ALAMAT]</code>.</p>
    </>
  )
}
