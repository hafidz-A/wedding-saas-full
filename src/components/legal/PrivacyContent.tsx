import { BRAND } from '@/lib/brand'
import type { Lang } from '@/lib/i18n/config'

/**
 * Kebijakan Privasi / Privacy Policy — body content only (no page chrome).
 *
 * Bilingual: renders the Indonesian original (transcribed from the
 * user-supplied "privacy policy.docx") or its English counterpart based on
 * the `lang` prop. Shared by the standalone /privacy route (wrapped in
 * LegalLayout) and the consent modal on /signup (wrapped in LegalModal).
 * Pure presentational JSX — safe to render from both Server (page) and
 * Client (modal) components.
 *
 * Domain (www.fincards.land) and contact rows are filled with launch
 * placeholders — swap for the final business line when ready.
 */
export default function PrivacyContent({ lang = 'id' }: { lang?: Lang }) {
  return lang === 'en' ? <PrivacyEn /> : <PrivacyId />
}

function PrivacyId() {
  return (
    <>
      <p>{BRAND} berkomitmen untuk melindungi Data Pribadi setiap pengguna layanan Kami sesuai dengan ketentuan peraturan perundang-undangan yang berlaku di Republik Indonesia, termasuk Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
      <p>Kebijakan Privasi ini menjelaskan bagaimana Kami memperoleh, mengumpulkan, menggunakan, menyimpan, mengungkapkan, mentransfer, memperbaiki, memperbarui, menghapus, dan melindungi Data Pribadi yang diperoleh melalui situs web dan/atau aplikasi Kami yang beralamat di www.fincards.land.</p>
      <p>Dengan mengakses, mendaftar, menggunakan layanan, atau melakukan transaksi pada {BRAND}, Anda menyatakan telah membaca, memahami, dan menyetujui Kebijakan Privasi ini.</p>

      <h2>1. Informasi Pribadi yang Kami Kumpulkan</h2>
      <p>Data pribadi yang kami kumpulkan termasuk namun tidak terbatas kepada:</p>
      <h3>Data Umum</h3>
      <ul>
        <li>Nama lengkap;</li>
        <li>Alamat email;</li>
        <li>Nomor telepon atau WhatsApp;</li>
        <li>Informasi akun dan autentikasi;</li>
        <li>Informasi acara pernikahan;</li>
        <li>Foto, video, dan konten yang diunggah;</li>
        <li>Nama tamu undangan;</li>
        <li>Status RSVP atau konfirmasi kehadiran;</li>
        <li>Ucapan, doa, komentar, atau pesan;</li>
        <li>Informasi rekening bank atau dompet digital yang ditampilkan pada fitur amplop digital;</li>
        <li>Informasi transaksi dan pembayaran;</li>
        <li>Alamat IP, informasi perangkat, browser, dan data penggunaan layanan; dan/atau</li>
        <li>Data Pribadi yang dikombinasikan untuk mengidentifikasi seseorang.</li>
      </ul>
      <h3>Data Spesifik</h3>
      <p>Data pribadi spesifik yang sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
      <p>{BRAND} tidak memperdagangkan Data Pribadi yang telah kami peroleh melalui aktivitas selain untuk keperluan sebagaimana dimaksud dalam penjelasan mengenai &ldquo;Penggunaan Data Pribadi&rdquo; di bawah ini.</p>
      <p>Pengguna dengan ini setuju bahwa kegagalan Pengguna untuk memberikan Data Pribadi yang benar dan akurat akan menjadi tanggung jawab Pengguna atas segala kerugian yang timbul, termasuk atas kerugian {BRAND} dan pihak ketiga lainnya. Selain itu, {BRAND} berwenang untuk menutup akses Pengguna pada Layanan {BRAND} jika terjadi kelalaian dari Pengguna sehubungan dengan kegagalan Pengguna untuk memberikan Data Pribadi yang benar dan akurat.</p>

      <h2>2. Tujuan Pemrosesan Data Pribadi</h2>
      <p>{BRAND} akan melakukan pemrosesan Data Pribadi yang diperoleh maupun dikumpulkan untuk tujuan antara lain:</p>
      <ul>
        <li>Membuat dan mengelola akun pengguna;</li>
        <li>Menyediakan layanan undangan digital;</li>
        <li>Menampilkan dan mengelola konten undangan;</li>
        <li>Mengelola RSVP, buku tamu digital, QR check-in, galeri foto dan video, serta fitur lainnya;</li>
        <li>Memproses transaksi dan pembayaran;</li>
        <li>Memberikan layanan pelanggan;</li>
        <li>Mengirimkan pemberitahuan terkait layanan;</li>
        <li>Meningkatkan keamanan, kualitas, dan performa layanan;</li>
        <li>Melakukan analisis penggunaan layanan;</li>
        <li>Mencegah penyalahgunaan, penipuan, atau aktivitas yang melanggar hukum; dan/atau</li>
        <li>Memenuhi kewajiban hukum dan peraturan perundang-undangan.</li>
      </ul>

      <h2>3. Data Tamu Undangan</h2>
      <p>Dalam hal Pengguna memasukkan, mengunggah, mengimpor, atau memberikan Data Pribadi tamu undangan kepada {BRAND}, Pengguna menyatakan dan menjamin bahwa Pengguna memiliki dasar hukum yang sah untuk memberikan Data Pribadi tersebut kepada {BRAND}, termasuk memperoleh persetujuan yang diperlukan sesuai ketentuan peraturan perundang-undangan.</p>
      <p>Dalam hal tamu secara langsung mengisi RSVP, buku tamu digital, ucapan, konfirmasi hadiah, atau fitur lainnya yang tersedia dalam layanan, tindakan tersebut dianggap sebagai persetujuan atas pemrosesan Data Pribadi untuk tujuan penyelenggaraan layanan undangan digital.</p>

      <h2>4. Pengungkapan Data Pribadi</h2>
      <p>{BRAND} dapat mengungkapkan Data Pribadi Pengguna kepada pihak lainnya yang bekerja sama dengan {BRAND} untuk melaksanakan tujuan penggunaan Data Pribadi sebagaimana dinyatakan dalam Kebijakan Privasi ini. Dalam hal {BRAND} melakukan pengungkapan Data Pribadi kepada pihak lain, {BRAND} akan senantiasa meminta kepada pihak lain tersebut untuk menjaga kerahasiaan dan keamanan atas Data Pribadi Pengguna sesuai dengan ketentuan yang berlaku.</p>

      <h2>5. Hak Subjek Data Pribadi</h2>
      <p>{BRAND} senantiasa berkomitmen untuk memenuhi hak Pengguna sebagai Subjek Data Pribadi untuk mendapatkan informasi mengenai Data Pribadi Pengguna yang telah dikumpulkan dan diproses oleh {BRAND}. Pengguna dapat meminta kepada {BRAND} untuk memperbaiki, melengkapi, memperbarui, atau menghapus Data Pribadi Pengguna di {BRAND} dengan memperhatikan ketentuan hukum yang berlaku. Namun, {BRAND} juga dapat menolak permintaan Pengguna apabila permintaan tersebut bertentangan dengan kepentingan hukum yang berlaku.</p>

      <h2>6. Penyimpanan Data Pribadi</h2>
      <p>{BRAND} menyimpan Data Pribadi selama diperlukan untuk memenuhi tujuan pemrosesan Data Pribadi. Data Pribadi dapat disimpan selama masa penggunaan layanan dan paling lama 5 (lima) tahun setelah berakhirnya hubungan layanan antara Pengguna dan {BRAND}, kecuali terdapat kewajiban hukum yang mengharuskan penyimpanan lebih lama. Data cadangan (backup) dapat tetap disimpan sepanjang diperlukan untuk tujuan keamanan sistem, pemulihan data, audit, kepatuhan hukum, dan kepentingan operasional yang sah.</p>

      <h2>7. Menampilkan, Mengumumkan, Mengirimkan, Menyebarluaskan, dan/atau Membuka Akses Data Pribadi</h2>
      <p>{BRAND} tidak akan menampilkan, mengumumkan, mengirimkan, menyebarluaskan, dan/atau membuka akses data pribadi tanpa persetujuan dari Pengguna, kecuali ditentukan lain oleh ketentuan peraturan perundang-undangan sepanjang masih sesuai dengan tujuan perolehan, pengumpulan, pengolahan, dan/atau penganalisisan data pribadi.</p>

      <h2>8. Pemusnahan Data Pribadi</h2>
      <p>Pemusnahan data pribadi hanya dapat dilakukan apabila telah melewati jangka waktu penyimpanan data pribadi atau atas permintaan. Pemusnahan dilakukan dengan menghilangkan sebagian atau keseluruhan dokumen terkait data pribadi termasuk elektronik maupun nonelektronik, sesuai dengan tujuan pemusnahan tersebut.</p>

      <h2>9. Pengamanan Data Pribadi</h2>
      <p>{BRAND} menggunakan berbagai cara untuk menjaga kerahasiaan Data Pribadi Pengguna agar tetap aman dan terlindungi dengan menggunakan perangkat keamanan yang telah teruji. Selain itu, {BRAND} dan seluruh jajaran staf dan pihak lainnya yang bekerja sama dengan {BRAND} telah berkomitmen untuk patuh serta menaati seluruh ketentuan yang berlaku terkait perlindungan Data Pribadi dan menerapkan langkah-langkah pengamanan dalam melakukan pemrosesan Data Pribadi. Demi keamanan Data Pribadi pengguna, kami menyarankan untuk menggunakan nomor unik, huruf dan karakter khusus, dan melindungi kata sandi akun {BRAND} sebaik mungkin dan untuk tidak membagikan kata sandi tersebut kepada siapapun. Kerugian yang diakibatkan oleh kelalaian Pengguna dalam menjaga kerahasiaan kata sandi adalah tanggung jawab Pengguna sepenuhnya.</p>

      <h2>10. Fitur Amplop Digital</h2>
      <p>Fitur amplop digital yang tersedia pada layanan {BRAND} hanya berfungsi sebagai sarana untuk menampilkan informasi rekening bank, dompet digital, atau metode pemberian hadiah lain yang dimasukkan oleh Pengguna. {BRAND} tidak menerima, menguasai, menampung, memproses, atau mendistribusikan dana hadiah yang diberikan kepada Pengguna melalui rekening atau metode pembayaran yang ditampilkan pada undangan. Seluruh transaksi hadiah berlangsung secara langsung antara pemberi hadiah dan Pengguna.</p>

      <h2>11. Cookies</h2>
      <p>{BRAND} dapat menggunakan cookies dan teknologi serupa untuk menjalankan layanan, menyimpan preferensi pengguna, memahami penggunaan layanan, meningkatkan pengalaman pengguna, dan menjaga keamanan sistem.</p>

      <h2>12. Persetujuan Penggunaan</h2>
      <p>Pengguna mengakui bahwa apabila Pengguna tidak memberikan informasi atau data yang relevan atau menarik persetujuan sehubungan dengan pengumpulan, penggunaan dan/atau pengungkapan informasi atau data sebagaimana dijelaskan dalam Kebijakan Privasi ini, maka {BRAND} mungkin tidak dapat menyediakan sebagian atau seluruh layanan kepada Pengguna.</p>
      <p>Pengguna menjamin bahwa setiap Data Pribadi yang diberikan kepada {BRAND}, baik milik Pengguna maupun milik pihak lain yang disampaikan oleh Pengguna, telah diberikan berdasarkan dasar hukum yang sah sesuai ketentuan peraturan perundang-undangan yang berlaku.</p>

      <h2>13. Hukum yang Berlaku</h2>
      <p>Kebijakan Privasi ini berlaku berdasarkan peraturan perundang-undangan dan hukum di Negara Kesatuan Republik Indonesia. Setiap perselisihan yang terkait dengan atau muncul dari situs ini akan tunduk dan diatur berdasarkan aturan hukum yang sama.</p>

      <h2>14. Perubahan Kebijakan Privasi</h2>
      <p>{BRAND} berhak mengubah atau memperbarui Kebijakan Privasi ini dari waktu ke waktu. Setiap perubahan akan diumumkan melalui situs web atau media komunikasi resmi {BRAND} dan berlaku sejak tanggal yang ditetapkan.</p>

      <h2>15. Hubungi {BRAND}</h2>
      <p>Untuk informasi lebih lanjut, Pengguna dapat menghubungi {BRAND} melalui:</p>
      <ul>
        <li>WhatsApp: <code>0851-1055-3938</code></li>
        <li>Telepon: <code>0851-1055-3938</code></li>
        <li>Email: <code>fincardsland@gmail.com</code></li>
      </ul>
    </>
  )
}

function PrivacyEn() {
  return (
    <>
      <p>{BRAND} is committed to protecting the Personal Data of every user of our services in accordance with the laws and regulations in force in the Republic of Indonesia, including Law Number 27 of 2022 on Personal Data Protection.</p>
      <p>This Privacy Policy explains how we obtain, collect, use, store, disclose, transfer, correct, update, erase, and protect Personal Data acquired through our website and/or application at www.fincards.land.</p>
      <p>By accessing, registering with, using, or transacting on {BRAND}, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>

      <h2>1. Personal Information We Collect</h2>
      <p>The personal data we collect includes, but is not limited to:</p>
      <h3>General Data</h3>
      <ul>
        <li>Full name;</li>
        <li>Email address;</li>
        <li>Telephone or WhatsApp number;</li>
        <li>Account and authentication information;</li>
        <li>Wedding event information;</li>
        <li>Photos, videos, and uploaded content;</li>
        <li>Names of invited guests;</li>
        <li>RSVP status or attendance confirmations;</li>
        <li>Well-wishes, prayers, comments, or messages;</li>
        <li>Bank account or e-wallet details displayed through the digital envelope feature;</li>
        <li>Transaction and payment information;</li>
        <li>IP address, device and browser information, and service usage data; and/or</li>
        <li>Any Personal Data which, in combination, may identify an individual.</li>
      </ul>
      <h3>Specific Data</h3>
      <p>Specific personal data as defined under the applicable laws and regulations.</p>
      <p>{BRAND} does not trade in the Personal Data we obtain, and uses it solely for the purposes described under &ldquo;Purposes of Personal Data Processing&rdquo; below.</p>
      <p>The User hereby agrees that any failure on the User&rsquo;s part to provide true and accurate Personal Data shall be the User&rsquo;s own responsibility, including for any resulting losses suffered by {BRAND} or third parties. {BRAND} further reserves the right to suspend the User&rsquo;s access to the {BRAND} Services in the event of negligence by the User in providing true and accurate Personal Data.</p>

      <h2>2. Purposes of Personal Data Processing</h2>
      <p>{BRAND} processes the Personal Data it obtains and collects for purposes that include:</p>
      <ul>
        <li>Creating and managing user accounts;</li>
        <li>Providing the digital invitation service;</li>
        <li>Displaying and managing invitation content;</li>
        <li>Operating RSVPs, the digital guestbook, QR check-in, photo and video galleries, and other features;</li>
        <li>Processing transactions and payments;</li>
        <li>Providing customer support;</li>
        <li>Sending service-related notifications;</li>
        <li>Improving the security, quality, and performance of the service;</li>
        <li>Analysing how the service is used;</li>
        <li>Preventing misuse, fraud, or unlawful activity; and/or</li>
        <li>Complying with legal and regulatory obligations.</li>
      </ul>

      <h2>3. Guest Data</h2>
      <p>Where the User enters, uploads, imports, or otherwise provides the Personal Data of invited guests to {BRAND}, the User represents and warrants that they have a lawful basis for doing so, including having obtained any consent required under the applicable laws and regulations.</p>
      <p>Where a guest directly completes an RSVP, the digital guestbook, well-wishes, a gift confirmation, or any other feature available within the service, that action constitutes consent to the processing of their Personal Data for the purpose of delivering the digital invitation service.</p>

      <h2>4. Disclosure of Personal Data</h2>
      <p>{BRAND} may disclose the User&rsquo;s Personal Data to partners who work with {BRAND} to fulfil the purposes of data use set out in this Privacy Policy. Whenever {BRAND} discloses Personal Data to another party, {BRAND} will require that party to maintain the confidentiality and security of the User&rsquo;s Personal Data in accordance with the applicable provisions.</p>

      <h2>5. Rights of Personal Data Subjects</h2>
      <p>{BRAND} is committed to honouring the User&rsquo;s rights as a Personal Data Subject, including the right to obtain information about the Personal Data that {BRAND} has collected and processed. The User may ask {BRAND} to correct, complete, update, or erase their Personal Data held by {BRAND}, subject to the applicable legal provisions. {BRAND} may, however, decline a request where granting it would conflict with prevailing legal interests.</p>

      <h2>6. Retention of Personal Data</h2>
      <p>{BRAND} retains Personal Data for as long as necessary to fulfil the purposes for which it is processed. Personal Data may be retained for the duration of the service relationship and for up to five (5) years after that relationship ends, unless a legal obligation requires a longer retention period. Backup copies may be kept for as long as necessary for system security, data recovery, audit, legal compliance, and legitimate operational purposes.</p>

      <h2>7. Displaying, Announcing, Transmitting, Disseminating, and/or Opening Access to Personal Data</h2>
      <p>{BRAND} will not display, announce, transmit, disseminate, and/or open access to personal data without the User&rsquo;s consent, except where otherwise provided by the applicable laws and regulations and only to the extent consistent with the purposes for which the personal data was obtained, collected, processed, and/or analysed.</p>

      <h2>8. Erasure of Personal Data</h2>
      <p>Personal data is destroyed only once its retention period has lapsed or upon request. Destruction is carried out by removing part or all of the records relating to the personal data, whether electronic or non-electronic, in line with the purpose of the destruction.</p>

      <h2>9. Security of Personal Data</h2>
      <p>{BRAND} employs a range of proven security measures to keep the User&rsquo;s Personal Data safe and confidential. {BRAND}, its staff, and the parties working with {BRAND} are committed to complying with all applicable data protection requirements and to applying appropriate safeguards when processing Personal Data. For the security of your own data, we recommend using a password that combines numbers, letters, and special characters, safeguarding your {BRAND} account password carefully, and never sharing it with anyone. Losses arising from the User&rsquo;s negligence in keeping their password confidential are entirely the User&rsquo;s responsibility.</p>

      <h2>10. Digital Envelope Feature</h2>
      <p>The digital envelope feature available on the {BRAND} service serves solely as a means of displaying the bank account, e-wallet, or other gifting details entered by the User. {BRAND} does not receive, hold, custody, process, or distribute any gift funds given to the User through the accounts or payment methods displayed on an invitation. All gift transactions take place directly between the gift giver and the User.</p>

      <h2>11. Cookies</h2>
      <p>{BRAND} may use cookies and similar technologies to operate the service, remember user preferences, understand how the service is used, improve the user experience, and keep the system secure.</p>

      <h2>12. Consent to Use</h2>
      <p>The User acknowledges that if they decline to provide relevant information or data, or withdraw consent to the collection, use, and/or disclosure of information or data as described in this Privacy Policy, {BRAND} may be unable to provide some or all of its services to the User.</p>
      <p>The User warrants that all Personal Data provided to {BRAND} — whether the User&rsquo;s own or that of another person supplied by the User — has been provided on a lawful basis in accordance with the applicable laws and regulations.</p>

      <h2>13. Governing Law</h2>
      <p>This Privacy Policy is governed by the laws and regulations of the Republic of Indonesia. Any dispute relating to or arising from this site shall be subject to and governed by the same body of law.</p>

      <h2>14. Changes to this Privacy Policy</h2>
      <p>{BRAND} reserves the right to amend or update this Privacy Policy from time to time. Any changes will be announced through the website or {BRAND}&rsquo;s official communication channels and take effect from the stated date.</p>

      <h2>15. Contact {BRAND}</h2>
      <p>For further information, the User may contact {BRAND} via:</p>
      <ul>
        <li>WhatsApp: <code>0851-1055-3938</code></li>
        <li>Phone: <code>0851-1055-3938</code></li>
        <li>Email: <code>fincardsland@gmail.com</code></li>
      </ul>
    </>
  )
}
