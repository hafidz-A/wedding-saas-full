import { BRAND } from '@/lib/brand'
import type { Lang } from '@/lib/i18n/config'

/**
 * Syarat & Ketentuan / Terms & Conditions — body content only (no page
 * chrome). Bilingual: renders Indonesian or English based on the `lang`
 * prop. Rendered by the standalone /terms route (wrapped in LegalLayout).
 *
 * Source: legal draft "SYARAT DAN KETENTUAN.docx" (brand updated to FinCards).
 * The English version is a professional rendering of the Indonesian original,
 * not a literal translation; the Indonesian text prevails in case of conflict.
 * WhatsApp/Telepon is the live FinCards business line (0851-1055-3938); the
 * Email (fincardsland@gmail.com) is a launch placeholder — swap for the final
 * business inbox when ready.
 */
export default function TermsContent({ lang = 'id' }: { lang?: Lang }) {
  return lang === 'en' ? <TermsEn /> : <TermsId />
}

function TermsId() {
  return (
    <>
      <h2>1. Ketentuan Umum</h2>
      <p>Syarat dan Ketentuan Umum ini penting untuk terlebih dahulu dibaca oleh Pengguna sebelum menggunakan layanan yang disediakan melalui website, aplikasi, maupun sistem elektronik {BRAND}.</p>
      <p>Halaman ini mengatur hak dan kewajiban yang mengikat secara hukum terhadap setiap Pengguna yang mengakses, menggunakan, memesan, membuat akun, maupun memanfaatkan layanan {BRAND}.</p>
      <p>Sebelum menggunakan layanan {BRAND}, Pengguna diwajibkan untuk membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan Umum ini beserta <a href="/privacy">Kebijakan Privasi</a> dan <a href="/refund">Kebijakan Pengembalian Dana</a> yang merupakan satu kesatuan yang tidak terpisahkan.</p>
      <p>Apabila Pengguna tidak menyetujui sebagian maupun seluruh isi Syarat dan Ketentuan ini, Pengguna diminta untuk tidak menggunakan layanan {BRAND}.</p>
      <p>Dengan mengakses, menggunakan, membuat akun, melakukan pemesanan, atau memanfaatkan layanan {BRAND}, Pengguna dianggap telah membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan ini.</p>

      <h2>2. Definisi</h2>
      <ul>
        <li><strong>Akun</strong> adalah identitas elektronik Pengguna yang terdaftar pada sistem {BRAND} yang digunakan untuk mengakses dan menggunakan layanan {BRAND}.</li>
        <li><strong>Acara</strong> adalah setiap kegiatan yang dibuat dan/atau dikelola melalui {BRAND} termasuk namun tidak terbatas pada pernikahan, pertunangan, lamaran, aqiqah, khitanan, ulang tahun, wisuda, seminar, webinar, gathering perusahaan, acara komunitas, kegiatan keagamaan, maupun kegiatan lainnya yang tidak bertentangan dengan hukum dan peraturan perundang-undangan yang berlaku.</li>
        <li><strong>{BRAND}</strong> adalah layanan digital yang dimiliki dan dioperasikan oleh pemilik {BRAND} (&ldquo;Penyedia&rdquo;) yang menyediakan sarana pembuatan, pengelolaan, dan penayangan halaman acara digital berbasis teknologi informasi.</li>
        <li><strong>Konten Pengguna</strong> adalah seluruh data, informasi, nama, foto, video, audio, logo, desain, daftar tamu, QR Code, ucapan, RSVP, maupun materi lainnya yang diunggah, dimasukkan, dikirimkan, atau ditampilkan oleh Pengguna melalui {BRAND}.</li>
        <li><strong>Layanan</strong> adalah seluruh layanan yang disediakan oleh {BRAND} termasuk namun tidak terbatas pada undangan digital, halaman acara digital, RSVP, buku tamu elektronik, galeri foto dan video, QR Check-In, manajemen peserta, dan fitur lainnya yang tersedia dari waktu ke waktu.</li>
        <li><strong>Masa Aktif</strong> adalah jangka waktu layanan yang diberikan kepada Pengguna sesuai dengan Paket yang dibeli.</li>
        <li><strong>Paket</strong> adalah jenis layanan yang disediakan {BRAND} yang memiliki fitur, fasilitas, dan Masa Aktif tertentu.</li>
        <li><strong>Pengguna</strong> adalah setiap orang perseorangan yang mengakses, menggunakan, memesan, membuat akun, maupun memanfaatkan layanan {BRAND}.</li>
        <li><strong>Tamu</strong> adalah pihak yang menerima, mengakses, atau berinteraksi dengan halaman acara yang dibuat oleh Pengguna.</li>
      </ul>

      <h2>3. Tentang {BRAND}</h2>
      <p>{BRAND} adalah platform digital yang menyediakan sarana bagi Pengguna untuk membuat, mengelola, dan menampilkan halaman acara digital berbasis teknologi informasi.</p>
      <p>Layanan {BRAND} dapat digunakan untuk berbagai jenis acara termasuk namun tidak terbatas pada pernikahan, pertunangan, lamaran, aqiqah, khitanan, ulang tahun, wisuda, seminar, webinar, gathering perusahaan, acara komunitas, kegiatan keagamaan, maupun acara lainnya yang diperbolehkan berdasarkan hukum yang berlaku di Negara Kesatuan Republik Indonesia.</p>
      <p>{BRAND} berhak untuk menambah, mengubah, mengurangi, menghentikan, maupun memperbarui sebagian atau seluruh fitur layanan sesuai kebutuhan operasional, pengembangan teknologi, maupun ketentuan hukum yang berlaku.</p>

      <h2>4. Syarat Pengguna Layanan</h2>
      <p>Untuk dapat menggunakan layanan {BRAND}, Pengguna wajib memenuhi ketentuan sebagai berikut:</p>
      <ol>
        <li>Berusia paling sedikit 18 (delapan belas) tahun atau telah memenuhi syarat kecakapan hukum berdasarkan peraturan perundang-undangan yang berlaku.</li>
        <li>Memiliki kewenangan untuk melakukan perbuatan hukum dan mengikatkan diri pada Syarat dan Ketentuan ini.</li>
        <li>Memberikan data, informasi, dan dokumen yang benar, akurat, lengkap, dan tidak menyesatkan.</li>
        <li>Menggunakan layanan {BRAND} hanya untuk tujuan yang sah dan tidak bertentangan dengan hukum.</li>
        <li>Bertanggung jawab penuh atas seluruh aktivitas yang dilakukan melalui Akun Pengguna.</li>
      </ol>
      <p>Pengguna dengan ini menyatakan dan menjamin bahwa seluruh data dan informasi yang diberikan kepada {BRAND} adalah benar, akurat, lengkap, dan dapat dipertanggungjawabkan secara hukum.</p>

      <h2>5. Pelaksanaan Layanan</h2>
      <p>{BRAND} menyediakan layanan pembuatan dan pengelolaan halaman acara digital yang dapat diakses melalui jaringan internet. Layanan yang tersedia dapat mencakup:</p>
      <ul>
        <li>Undangan digital;</li>
        <li>Halaman acara digital;</li>
        <li>RSVP;</li>
        <li>Buku tamu elektronik;</li>
        <li>Galeri foto;</li>
        <li>Galeri video;</li>
        <li>QR Check-In;</li>
        <li>Manajemen peserta;</li>
        <li>Fitur pendukung acara lainnya yang tersedia pada Paket tertentu.</li>
      </ul>
      <p>Setiap pembelian Paket berlaku untuk 1 (satu) Acara. Pengguna memahami dan menyetujui bahwa setiap perubahan identitas Acara yang bersifat material setelah aktivasi layanan dapat dikenakan biaya tambahan atau memerlukan pembelian Paket baru sesuai dengan kebijakan {BRAND}.</p>
      <p>{BRAND} berhak melakukan pemeliharaan sistem, pembaruan sistem, pembatasan akses sementara, maupun tindakan teknis lainnya yang dianggap perlu untuk menjaga keamanan, stabilitas, dan keberlangsungan layanan.</p>

      <h2>6. Pemesanan, Biaya, dan Pembayaran</h2>
      <p>Pengguna dapat melakukan pemesanan Layanan melalui mekanisme yang tersedia pada {BRAND}. Setiap pemesanan dianggap sah dan mengikat setelah:</p>
      <ol>
        <li>Pengguna menyelesaikan proses pemesanan;</li>
        <li>pembayaran berhasil diterima dan diverifikasi; dan</li>
        <li>layanan diaktifkan oleh sistem {BRAND}.</li>
      </ol>
      <p>{BRAND} berhak menolak, menangguhkan, atau membatalkan pemesanan apabila ditemukan indikasi pelanggaran hukum, penyalahgunaan layanan, penggunaan identitas palsu, atau keadaan lain yang menurut pertimbangan {BRAND} dapat menimbulkan risiko bagi {BRAND} maupun pihak ketiga.</p>
      <p>Seluruh biaya layanan yang tercantum pada {BRAND} dinyatakan dalam Rupiah dan wajib dibayarkan melalui metode pembayaran yang tersedia, termasuk namun tidak terbatas pada <strong>Midtrans</strong>.</p>
      <p>Pengguna memahami dan menyetujui bahwa biaya layanan yang telah dibayarkan tidak dapat diminta kembali, kecuali dalam kondisi sesuai dengan <a href="/refund">Kebijakan Pengembalian Dana</a> {BRAND} yang berlaku.</p>
      <p>Masa Aktif layanan mengikuti Paket yang dipilih oleh Pengguna. Setelah Masa Aktif berakhir, {BRAND} berhak membatasi, menonaktifkan, menghapus, atau mengarsipkan halaman Acara dan data terkait sesuai kebijakan penyimpanan data yang berlaku.</p>

      <h2>7. Pernyataan dan Jaminan Pengguna</h2>
      <p>Dengan menggunakan {BRAND}, Pengguna dengan ini menyatakan, menjamin, dan menyetujui bahwa:</p>
      <ol>
        <li>seluruh data, informasi, foto, video, audio, nama peserta, daftar tamu, maupun Konten Pengguna lainnya adalah benar, sah, akurat, dan tidak menyesatkan;</li>
        <li>Pengguna memiliki seluruh hak, izin, persetujuan, dan kewenangan yang diperlukan untuk menggunakan, mengunggah, menampilkan, dan mempublikasikan Konten Pengguna;</li>
        <li>penggunaan layanan {BRAND} tidak akan melanggar peraturan perundang-undangan yang berlaku;</li>
        <li>penggunaan layanan {BRAND} tidak ditujukan untuk kegiatan yang mengandung unsur penipuan, perjudian, pornografi, pelanggaran hak cipta, pencemaran nama baik, ujaran kebencian, maupun kegiatan lain yang dilarang berdasarkan hukum;</li>
        <li>Pengguna bertanggung jawab penuh atas seluruh Konten Pengguna yang ditampilkan melalui {BRAND}.</li>
      </ol>
      <p>Apabila terdapat tuntutan, gugatan, klaim, kerugian, biaya, denda, maupun tanggung jawab hukum yang timbul akibat tindakan atau pelanggaran Pengguna, maka Pengguna wajib membebaskan dan mengganti kerugian {BRAND} dari segala tuntutan tersebut.</p>

      <h2>8. Konten Pengguna</h2>
      <p>Seluruh Konten Pengguna tetap menjadi milik Pengguna. Namun demikian, Pengguna memberikan hak kepada {BRAND} untuk menyimpan, memproses, menampilkan, mengirimkan, mengubah ukuran, mengoptimalkan, mencadangkan, dan melakukan tindakan teknis lain yang diperlukan untuk penyelenggaraan layanan.</p>
      <p>Pengguna dilarang mengunggah Konten Pengguna yang:</p>
      <ol>
        <li>melanggar hukum;</li>
        <li>melanggar hak kekayaan intelektual pihak lain;</li>
        <li>mengandung malware atau kode berbahaya;</li>
        <li>mengandung unsur pornografi, perjudian, kekerasan, diskriminasi, atau ujaran kebencian; dan</li>
        <li>dapat menimbulkan kerugian bagi {BRAND} maupun pihak ketiga.</li>
      </ol>
      <p>{BRAND} berhak menolak, membatasi akses, menghapus, menurunkan, atau menonaktifkan Konten Pengguna yang dianggap melanggar Ketentuan ini tanpa kewajiban memberikan kompensasi dalam bentuk apa pun.</p>

      <h2>9. Risiko Penggunaan Layanan</h2>
      <p>Pengguna memahami dan menyetujui bahwa penggunaan layanan elektronik memiliki risiko yang melekat, termasuk namun tidak terbatas pada:</p>
      <ol>
        <li>gangguan jaringan internet;</li>
        <li>kegagalan perangkat keras atau perangkat lunak;</li>
        <li>gangguan layanan pihak ketiga;</li>
        <li>kegagalan sistem komunikasi elektronik;</li>
        <li>serangan siber;</li>
        <li>kehilangan data akibat keadaan di luar kendali {BRAND}; dan</li>
        <li>kesalahan atau kelalaian Pengguna.</li>
      </ol>
      <p>Pengguna dengan ini menerima seluruh risiko yang timbul dari penggunaan layanan sepanjang risiko tersebut tidak secara langsung disebabkan oleh kesalahan atau kelalaian {BRAND}.</p>

      <h2>10. Sanksi</h2>
      <p>{BRAND} berhak mengenakan tindakan administratif terhadap Pengguna yang melanggar Syarat dan Ketentuan ini, termasuk namun tidak terbatas pada:</p>
      <ol>
        <li>pemberian peringatan;</li>
        <li>pembatasan akses terhadap sebagian atau seluruh layanan;</li>
        <li>penangguhan akun;</li>
        <li>penghapusan Konten Pengguna;</li>
        <li>penghentian layanan;</li>
        <li>pemblokiran akun secara permanen; dan/atau</li>
        <li>tindakan hukum lainnya sesuai ketentuan peraturan perundang-undangan yang berlaku.</li>
      </ol>
      <p>Pengenaan sanksi sebagaimana dimaksud dalam ketentuan ini tidak menghapus hak {BRAND} untuk menuntut ganti rugi maupun mengambil tindakan hukum lainnya terhadap Pengguna.</p>

      <h2>11. Pembatasan Tanggung Jawab</h2>
      <p>Pengguna memahami dan menyetujui bahwa {BRAND} merupakan penyedia platform teknologi yang menyediakan sarana pembuatan dan pengelolaan halaman acara digital. {BRAND} tidak bertanggung jawab atas:</p>
      <ol>
        <li>isi, keakuratan, kelengkapan, atau legalitas Konten Pengguna;</li>
        <li>hubungan hukum antara Pengguna dengan Tamu atau pihak ketiga lainnya;</li>
        <li>pembatalan, penundaan, perubahan, atau kegagalan penyelenggaraan Acara;</li>
        <li>kerugian yang timbul akibat kesalahan data yang diberikan oleh Pengguna;</li>
        <li>kerugian tidak langsung, kehilangan keuntungan, kehilangan kesempatan bisnis, kehilangan data, kehilangan reputasi, atau kerugian konsekuensial lainnya; dan</li>
        <li>tindakan pihak ketiga yang berada di luar kendali {BRAND}.</li>
      </ol>
      <p>Sepanjang diperbolehkan oleh hukum yang berlaku, total tanggung jawab {BRAND} atas setiap klaim yang timbul sehubungan dengan penggunaan layanan dibatasi setinggi-tingginya sebesar jumlah biaya yang telah dibayarkan Pengguna kepada {BRAND} untuk layanan yang menjadi dasar klaim tersebut.</p>

      <h2>12. Keadaan Kahar (Force Majeure)</h2>
      <p>{BRAND} tidak bertanggung jawab atas keterlambatan, gangguan, kegagalan, atau tidak dapat dilaksanakannya kewajiban yang disebabkan oleh keadaan kahar (force majeure). Keadaan kahar meliputi namun tidak terbatas pada:</p>
      <ol>
        <li>bencana alam;</li>
        <li>kebakaran;</li>
        <li>banjir;</li>
        <li>gempa bumi;</li>
        <li>perang;</li>
        <li>kerusuhan;</li>
        <li>wabah penyakit;</li>
        <li>gangguan jaringan telekomunikasi;</li>
        <li>gangguan pusat data;</li>
        <li>serangan siber skala besar; dan/atau</li>
        <li>keadaan lain di luar kendali wajar {BRAND}.</li>
      </ol>
      <p>Dalam hal terjadi keadaan kahar, {BRAND} berhak menunda pelaksanaan kewajibannya selama keadaan tersebut berlangsung.</p>

      <h2>13. Komunikasi Elektronik</h2>
      <p>Pengguna menyetujui bahwa seluruh komunikasi, pemberitahuan, konfirmasi, persetujuan, informasi layanan, perubahan kebijakan, maupun dokumen lainnya dapat disampaikan melalui sarana elektronik.</p>
      <p>Komunikasi yang disampaikan melalui email, dashboard akun, website, pesan elektronik, maupun media komunikasi resmi {BRAND} dianggap telah diterima secara sah oleh Pengguna.</p>

      <h2>14. Perubahan Layanan dan Syarat &amp; Ketentuan</h2>
      <p>{BRAND} berhak sewaktu-waktu:</p>
      <ol>
        <li>menambah fitur;</li>
        <li>mengurangi fitur;</li>
        <li>mengubah fitur;</li>
        <li>menghentikan fitur tertentu;</li>
        <li>memperbarui sistem; dan/atau</li>
        <li>mengubah Syarat dan Ketentuan ini.</li>
      </ol>
      <p>Perubahan tersebut akan diumumkan melalui media komunikasi resmi {BRAND} dan berlaku sejak tanggal yang ditentukan oleh {BRAND}. Dengan tetap menggunakan layanan setelah perubahan diberlakukan, Pengguna dianggap telah menyetujui perubahan tersebut.</p>

      <h2>15. Hukum yang Berlaku dan Penyelesaian Sengketa</h2>
      <p>Syarat dan Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia.</p>
      <p>Setiap perselisihan, sengketa, atau perbedaan pendapat yang timbul sehubungan dengan penggunaan layanan {BRAND} akan diselesaikan terlebih dahulu secara musyawarah untuk mencapai mufakat.</p>
      <p>Apabila dalam waktu 30 (tiga puluh) hari kalender musyawarah tidak mencapai penyelesaian, maka sengketa akan diselesaikan melalui Pengadilan Negeri Jakarta Pusat.</p>

      <h2>16. Ketentuan Lain-Lain</h2>
      <p>Apabila terdapat satu atau lebih ketentuan dalam Syarat dan Ketentuan ini yang dinyatakan tidak sah, tidak berlaku, atau tidak dapat dilaksanakan berdasarkan putusan pengadilan atau ketentuan hukum yang berlaku, maka ketentuan lainnya tetap berlaku dan mengikat sepenuhnya.</p>
      <p>Kegagalan {BRAND} dalam melaksanakan atau menegakkan suatu hak berdasarkan Syarat dan Ketentuan ini tidak dapat dianggap sebagai pengesampingan hak tersebut.</p>
      <p>Syarat dan Ketentuan ini merupakan keseluruhan perjanjian antara {BRAND} dan Pengguna terkait penggunaan layanan {BRAND} serta menggantikan seluruh komunikasi, pemahaman, maupun kesepakatan sebelumnya yang berkaitan dengan hal yang sama.</p>

      <h2>17. Kontak</h2>
      <p>Untuk informasi lebih lanjut, Pengguna dapat menghubungi {BRAND} melalui:</p>
      <ul>
        <li>WhatsApp: <code>0851-1055-3938</code></li>
        <li>Telepon: <code>0851-1055-3938</code></li>
        <li>Email: <code>fincardsland@gmail.com</code></li>
      </ul>
      <p><strong>Dengan menggunakan layanan {BRAND}, Pengguna menyatakan telah membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan ini.</strong></p>
    </>
  )
}

function TermsEn() {
  return (
    <>
      <h2>1. General Provisions</h2>
      <p>These General Terms and Conditions should be read carefully before using any of the services made available through the {BRAND} website, application, or other electronic systems.</p>
      <p>This page sets out the rights and obligations that legally bind every User who accesses, uses, places orders through, registers an account with, or otherwise avails themselves of the {BRAND} services.</p>
      <p>Before using the {BRAND} services, Users are required to read, understand, and accept these General Terms and Conditions in full, together with the <a href="/privacy">Privacy Policy</a> and the <a href="/refund">Refund Policy</a>, all of which together constitute a single, inseparable instrument.</p>
      <p>Users who do not agree to these Terms and Conditions, whether in part or in whole, are requested to refrain from using the {BRAND} services.</p>
      <p>By accessing, using, registering an account with, placing an order through, or otherwise availing themselves of the {BRAND} services, Users are deemed to have read, understood, and accepted these Terms and Conditions in their entirety.</p>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>Account</strong> means the electronic identity registered to a User on the {BRAND} system, through which the User accesses and uses the {BRAND} services.</li>
        <li><strong>Event</strong> means any occasion created and/or managed through {BRAND}, including but not limited to weddings, engagements, proposal ceremonies, aqiqah, circumcision celebrations, birthdays, graduations, seminars, webinars, corporate gatherings, community events, religious occasions, and any other activity not contrary to prevailing laws and regulations.</li>
        <li><strong>{BRAND}</strong> means the digital service owned and operated by the proprietor of {BRAND} (the &ldquo;Provider&rdquo;), which furnishes the means to create, manage, and publish digital event pages built on information technology.</li>
        <li><strong>User Content</strong> means all data, information, names, photographs, videos, audio, logos, designs, guest lists, QR Codes, well-wishes, RSVPs, and any other material uploaded, entered, submitted, or displayed by a User through {BRAND}.</li>
        <li><strong>Service</strong> means every service provided by {BRAND}, including but not limited to digital invitations, digital event pages, RSVP, electronic guestbooks, photo and video galleries, QR Check-In, attendee management, and such other features as may be made available from time to time.</li>
        <li><strong>Active Period</strong> means the duration of service granted to a User under the Plan purchased.</li>
        <li><strong>Plan</strong> means a tier of service offered by {BRAND}, each carrying its own features, facilities, and Active Period.</li>
        <li><strong>User</strong> means any natural person who accesses, uses, orders, registers an account with, or otherwise makes use of the {BRAND} services.</li>
        <li><strong>Guest</strong> means any party who receives, accesses, or interacts with an event page created by a User.</li>
      </ul>

      <h2>3. About {BRAND}</h2>
      <p>{BRAND} is a digital platform that equips Users to create, manage, and present digital event pages built on information technology.</p>
      <p>The {BRAND} services may be used for a broad range of occasions, including but not limited to weddings, engagements, proposal ceremonies, aqiqah, circumcision celebrations, birthdays, graduations, seminars, webinars, corporate gatherings, community events, religious occasions, and any other event permitted under the laws of the Republic of Indonesia.</p>
      <p>{BRAND} reserves the right to add to, alter, reduce, discontinue, or update any or all features of the service as operational needs, technological development, or applicable law may require.</p>

      <h2>4. Eligibility Requirements</h2>
      <p>To use the {BRAND} services, a User must:</p>
      <ol>
        <li>be at least eighteen (18) years of age or otherwise possess legal capacity under prevailing laws and regulations;</li>
        <li>hold the authority to perform legal acts and to bind themselves to these Terms and Conditions;</li>
        <li>supply data, information, and documents that are true, accurate, complete, and not misleading;</li>
        <li>use the {BRAND} services solely for lawful purposes that do not contravene the law; and</li>
        <li>bear full responsibility for all activity conducted through their Account.</li>
      </ol>
      <p>The User hereby represents and warrants that all data and information furnished to {BRAND} is true, accurate, complete, and legally accountable.</p>

      <h2>5. Provision of the Service</h2>
      <p>{BRAND} provides services for the creation and management of digital event pages accessible over the internet. The services available may encompass:</p>
      <ul>
        <li>Digital invitations;</li>
        <li>Digital event pages;</li>
        <li>RSVP;</li>
        <li>Electronic guestbook;</li>
        <li>Photo gallery;</li>
        <li>Video gallery;</li>
        <li>QR Check-In;</li>
        <li>Attendee management;</li>
        <li>Other event-support features available on particular Plans.</li>
      </ul>
      <p>Each Plan purchased applies to one (1) Event. The User understands and agrees that any material change to the identity of an Event after the service has been activated may attract additional charges or require the purchase of a new Plan, in accordance with {BRAND} policy.</p>
      <p>{BRAND} reserves the right to carry out system maintenance, system updates, temporary access restrictions, or any other technical measure it deems necessary to preserve the security, stability, and continuity of the service.</p>

      <h2>6. Orders, Fees, and Payment</h2>
      <p>Users may order the Service through the mechanisms available on {BRAND}. An order is deemed valid and binding once:</p>
      <ol>
        <li>the User has completed the ordering process;</li>
        <li>payment has been successfully received and verified; and</li>
        <li>the service has been activated by the {BRAND} system.</li>
      </ol>
      <p>{BRAND} reserves the right to decline, suspend, or cancel any order upon indication of unlawful conduct, misuse of the service, use of a false identity, or any other circumstance which, in {BRAND}&rsquo;s reasonable judgment, may expose {BRAND} or third parties to risk.</p>
      <p>All service fees displayed on {BRAND} are quoted in Indonesian Rupiah and are payable through the available payment methods, including but not limited to <strong>Midtrans</strong>.</p>
      <p>The User understands and agrees that service fees, once paid, are non-refundable save under the conditions prescribed in the prevailing {BRAND} <a href="/refund">Refund Policy</a>.</p>
      <p>The Active Period of the service follows the Plan the User has selected. Upon its expiry, {BRAND} reserves the right to restrict, deactivate, delete, or archive the Event page and any associated data in accordance with its prevailing data-retention policy.</p>

      <h2>7. User Representations and Warranties</h2>
      <p>By using {BRAND}, the User hereby represents, warrants, and agrees that:</p>
      <ol>
        <li>all data, information, photographs, videos, audio, attendee names, guest lists, and other User Content is true, lawful, accurate, and not misleading;</li>
        <li>the User holds every right, permission, consent, and authority required to use, upload, display, and publish the User Content;</li>
        <li>the User&rsquo;s use of the {BRAND} services will not contravene any applicable laws or regulations;</li>
        <li>the {BRAND} services will not be put to any use involving fraud, gambling, pornography, copyright infringement, defamation, hate speech, or any other activity prohibited by law; and</li>
        <li>the User bears full responsibility for all User Content displayed through {BRAND}.</li>
      </ol>
      <p>Should any demand, suit, claim, loss, expense, penalty, or legal liability arise from the User&rsquo;s conduct or breach, the User shall indemnify {BRAND} and hold it harmless against all such claims.</p>

      <h2>8. User Content</h2>
      <p>All User Content remains the property of the User. The User nonetheless grants {BRAND} the right to store, process, display, transmit, resize, optimise, back up, and perform such other technical operations as the delivery of the service requires.</p>
      <p>Users are prohibited from uploading User Content that:</p>
      <ol>
        <li>violates the law;</li>
        <li>infringes the intellectual property rights of others;</li>
        <li>contains malware or malicious code;</li>
        <li>contains elements of pornography, gambling, violence, discrimination, or hate speech; or</li>
        <li>may cause harm to {BRAND} or to third parties.</li>
      </ol>
      <p>{BRAND} reserves the right to refuse, restrict access to, remove, take down, or deactivate any User Content it considers to be in breach of these Terms, without any obligation to provide compensation of any kind.</p>

      <h2>9. Risks of Using the Service</h2>
      <p>The User understands and agrees that the use of electronic services carries inherent risks, including but not limited to:</p>
      <ol>
        <li>internet network disruptions;</li>
        <li>hardware or software failures;</li>
        <li>disruptions to third-party services;</li>
        <li>failures of electronic communication systems;</li>
        <li>cyberattacks;</li>
        <li>loss of data owing to circumstances beyond {BRAND}&rsquo;s control; and</li>
        <li>the User&rsquo;s own errors or negligence.</li>
      </ol>
      <p>The User hereby assumes all risks arising from use of the service, save where such risks stem directly from the fault or negligence of {BRAND}.</p>

      <h2>10. Sanctions</h2>
      <p>{BRAND} reserves the right to take administrative measures against any User who breaches these Terms and Conditions, including but not limited to:</p>
      <ol>
        <li>issuing a warning;</li>
        <li>restricting access to part or all of the service;</li>
        <li>suspending the account;</li>
        <li>removing User Content;</li>
        <li>terminating the service;</li>
        <li>permanently blocking the account; and/or</li>
        <li>any other legal action in accordance with prevailing laws and regulations.</li>
      </ol>
      <p>The imposition of any sanction under this section is without prejudice to {BRAND}&rsquo;s right to claim damages or to pursue any other legal remedy against the User.</p>

      <h2>11. Limitation of Liability</h2>
      <p>The User understands and agrees that {BRAND} is a technology platform provider offering the means to create and manage digital event pages. {BRAND} accepts no responsibility for:</p>
      <ol>
        <li>the content, accuracy, completeness, or legality of User Content;</li>
        <li>the legal relationship between the User and any Guest or other third party;</li>
        <li>the cancellation, postponement, alteration, or failure of an Event;</li>
        <li>losses arising from inaccurate data supplied by the User;</li>
        <li>indirect losses, loss of profit, loss of business opportunity, loss of data, loss of reputation, or any other consequential loss; and</li>
        <li>the conduct of third parties beyond {BRAND}&rsquo;s control.</li>
      </ol>
      <p>To the fullest extent permitted by applicable law, {BRAND}&rsquo;s aggregate liability for any claim arising in connection with the use of the service shall not exceed the amount the User has paid to {BRAND} for the service giving rise to that claim.</p>

      <h2>12. Force Majeure</h2>
      <p>{BRAND} shall not be held liable for any delay, disruption, failure, or non-performance of its obligations occasioned by force majeure, which includes but is not limited to:</p>
      <ol>
        <li>natural disasters;</li>
        <li>fire;</li>
        <li>floods;</li>
        <li>earthquakes;</li>
        <li>war;</li>
        <li>civil unrest;</li>
        <li>epidemics;</li>
        <li>telecommunications network disruptions;</li>
        <li>data-centre disruptions;</li>
        <li>large-scale cyberattacks; and/or</li>
        <li>any other circumstance beyond {BRAND}&rsquo;s reasonable control.</li>
      </ol>
      <p>Should a force majeure event occur, {BRAND} reserves the right to suspend the performance of its obligations for the duration of that event.</p>

      <h2>13. Electronic Communications</h2>
      <p>The User consents to receiving all communications, notices, confirmations, approvals, service information, policy changes, and other documents by electronic means.</p>
      <p>Communications delivered via email, the account dashboard, the website, electronic messaging, or {BRAND}&rsquo;s official communication channels are deemed to have been validly received by the User.</p>

      <h2>14. Changes to the Service and these Terms</h2>
      <p>{BRAND} reserves the right, at any time, to:</p>
      <ol>
        <li>add features;</li>
        <li>reduce features;</li>
        <li>modify features;</li>
        <li>discontinue particular features;</li>
        <li>update the system; and/or</li>
        <li>amend these Terms and Conditions.</li>
      </ol>
      <p>Such changes will be announced through {BRAND}&rsquo;s official communication channels and take effect on the date {BRAND} designates. Continued use of the service after a change has taken effect constitutes the User&rsquo;s acceptance of that change.</p>

      <h2>15. Governing Law and Dispute Resolution</h2>
      <p>These Terms and Conditions are governed by, and shall be construed in accordance with, the laws of the Republic of Indonesia.</p>
      <p>Any dispute, controversy, or difference of opinion arising in connection with the use of the {BRAND} services shall first be resolved amicably through deliberation towards consensus.</p>
      <p>Should deliberation fail to produce a resolution within thirty (30) calendar days, the dispute shall be referred to the Central Jakarta District Court (Pengadilan Negeri Jakarta Pusat).</p>

      <h2>16. Miscellaneous</h2>
      <p>Should any provision of these Terms and Conditions be declared invalid, void, or unenforceable by a court ruling or under applicable law, the remaining provisions shall continue in full force and effect.</p>
      <p>No failure by {BRAND} to exercise or enforce any right under these Terms and Conditions shall operate as a waiver of that right.</p>
      <p>These Terms and Conditions constitute the entire agreement between {BRAND} and the User concerning the use of the {BRAND} services, and supersede all prior communications, understandings, and arrangements relating to the same subject matter.</p>

      <h2>17. Contact</h2>
      <p>For further information, Users may contact {BRAND} via:</p>
      <ul>
        <li>WhatsApp: <code>0851-1055-3938</code></li>
        <li>Phone: <code>0851-1055-3938</code></li>
        <li>Email: <code>fincardsland@gmail.com</code></li>
      </ul>
      <p><strong>By using the {BRAND} services, the User affirms that they have read, understood, and agreed to these Terms and Conditions in their entirety.</strong></p>
    </>
  )
}
