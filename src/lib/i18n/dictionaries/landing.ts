export const landing = {
  id: {
    hero: {
      kicker: 'DEMO LENGKAP, TANPA DAFTAR',
      title: 'Undangan? Ini lebih mirip film pendek.',
      subtitle:
        'Tamu scroll, ceritamu terbuka scene demi scene — dari gerbang pembuka sampai RSVP. Buka demo lengkapnya sekarang, lihat persis apa yang kamu dapat sebelum memutuskan.',
      /* Single hero CTA. The old pair ("Lihat Demo Lengkap" + "Lihat Template")
         both pointed at /#vibe, so the second one bought nothing. */
      ctaPrimary: 'Lihat Template',
      reassure: 'Bayar sekali, tanpa langganan bulanan',
      /* {price} is filled from the cheapest live template_plans row — never hardcode. */
      priceFrom: 'Mulai {price}',
    },
    trustBar: {
      label: 'Alasan untuk tenang',
      oneTime: 'Bayar sekali, bukan langganan',
      payment: 'Pembayaran aman lewat Midtrans',
      encrypted: 'Data tamu terenkripsi',
      support: 'Tanya langsung via WhatsApp',
    },
    emotionalHook: {
      title: 'Kesan pertama momen bahagiamu.',
      body: 'Link undangan ini pembuka momen spesialmu. Begitu dibuka, foto, lagu latar, hingga garis cerita pernikahanmu terbuka secara interaktif di layar setiap tamu.',
    },
    vibeExploration: {
      heading: 'Coba Vibe-nya Langsung di Halaman Ini',
      subheading: 'Eksplorasi gaya dan warna pilihanmu langsung di sini.',
      templateEyebrow: 'Template',
      paletteLabel: 'Pilih Palette',
      ambienceLabel: 'Ambience',
      viewLive: 'Lihat Undangan Asli',
      previewOpen: 'Buka undangan lengkap',
      /* Rides inside the "Lihat Undangan Asli" pill as a chip, so the price
         question is answered on the control itself instead of a line below. */
      previewHint: 'Gratis',
      previewHintFull: 'Gratis, tanpa perlu daftar',
      previewClose: 'Tutup pratinjau',
      previewNewTab: 'Buka di tab baru',
      previewLoading: 'Menyiapkan undangan…',
      viewPlans: 'Lihat Paket',
      buy: 'Beli Undangan',
      buyAlt: 'Cek Harga Undanganmu',
      popularBadge: 'Paling populer',
      plansSubtitle: 'Bayar sekali, undangan langsung aktif — tanpa langganan bulanan.',
      plansTitle: 'Pilih paket',
      choosePlan: 'Pilih paket ini',
      guestQuota: '{n} tamu undangan',
      closePlans: 'Tutup',
      prevTemplate: 'Template sebelumnya',
      nextTemplate: 'Template berikutnya',
      previewNames: 'Rani & Adi',
      previewEyebrow: 'The Wedding Of',
      previewDate: '20 Desember 2026',
      byTemplate: {
        lovebirds: {
          tagline: 'Sinematik & hangat',
          blurb: 'Kartu foto polaroid, animasi botanical, dan section lengkap — RSVP, gift, galeri, hingga buku tamu.',
        },
        solary: {
          tagline: 'Futuristik & berani',
          blurb: 'Tata surya 3D, perjalanan antar-planet saat scroll, dan palette switcher yang hidup.',
        },
      },
    },
    features: {
      heading: 'Tampilan Anggun, Pengelolaan Sempurna',
      subheading: 'Data RSVP terorganisir otomatis, konfirmasi hadiah tercatat rapi, dan musik mengalun indah. Fokusmu tinggal satu: menikmati hari bahagia.',
      items: [
        {
          title: 'RSVP & Manajemen Tamu',
          body: 'Konfirmasi kehadiran, jumlah tamu, hingga pesan ucapan tercatat secara otomatis di dashboard. Bebas dari rekapitulasi manual yang menyita waktu.',
        },
        {
          title: 'Musik Latar',
          body: 'Unggah lagu pilihanmu untuk alunan musik yang otomatis berputar saat undangan dibuka. Sentuhan personal yang menghadirkan suasana hangat.',
        },
        {
          title: 'Galeri, Cerita & Hadiah Digital',
          body: 'Rangkaian perjalanan kasih dalam timeline interaktif, galeri foto berkualitas tinggi, serta konfirmasi transfer hadiah yang tercatat rapi sesuai rekening pilihanmu.',
        },
      ],
    },
    howItWorks: {
      heading: 'Cuma tiga langkah',
      steps: [
        { title: 'Pilih template & paket', body: 'Buka demo lengkapnya dulu, lalu pilih gaya dan paket yang paling cocok dengan ceritamu.' },
        { title: 'Bayar sekali', body: 'Sekali bayar, dashboard editor langsung terbuka. Tanpa langganan bulanan.' },
        { title: 'Isi cerita & sebar link', body: 'Atur foto, cerita, dan detail acara sendiri kapan saja, lalu sebar ke tamu lewat WhatsApp — pantau RSVP real-time.' },
      ],
    },
    testimonials: {
      heading: 'Kata Mereka Yang Berbahagia',
      subheading: 'Dari pasangan yang undangannya sudah lebih dulu disebar.',
      emptyHeading: 'Ceritamu bisa jadi yang pertama',
      emptyBody: 'Belum ada ulasan yang tayang. Buat undanganmu, rasakan sendiri di hari bahagiamu, lalu jadilah pasangan pertama yang berbagi kesan di sini.',
      emptyCta: 'Mulai Rancang Undangan',
    },
    faq: {
      heading: 'Pertanyaan yang sering muncul',
      items: [
        {
          q: 'Bisa lihat contohnya dulu sebelum bayar?',
          a: 'Bisa. Demo lengkap tiap template terbuka langsung di halaman ini tanpa perlu daftar — persis seperti yang akan dilihat tamu, lengkap dengan animasi, RSVP, dan galerinya. Untuk mengisi foto dan ceritamu sendiri, dashboard editor terbuka setelah pembayaran.',
        },
        {
          q: 'Undangannya aktif berapa lama?',
          a: 'Tergantung paket yang dipilih — sebagian berlaku untuk periode tertentu, sebagian aktif seumur hidup. Kalau masa aktifnya habis, undangan bisa diperpanjang tanpa kehilangan data RSVP maupun buku tamu.',
        },
        {
          q: 'Masih bisa diubah setelah link disebar?',
          a: 'Masih. Dashboard tetap terbuka setelah undangan tayang, jadi foto, jam acara, atau lokasi bisa diganti kapan saja dan langsung tampil di link yang sama. Tamu tidak perlu dikirimi link baru.',
        },
        {
          q: 'Kalau tamunya lebih banyak dari kuota?',
          a: 'Kuota tamu bisa ditambah per blok 50 tanpa perlu membuat undangan baru. Data yang sudah masuk tetap utuh.',
        },
        {
          q: 'Tamu perlu install aplikasi?',
          a: 'Tidak perlu. Undangan terbuka langsung di browser HP lewat link biasa, dan bisa dibagikan via WhatsApp seperti pesan lain.',
        },
      ],
    },
    finalCta: {
      title: 'Siap bikin undanganmu?',
      subtitle: 'Buka demo lengkapnya, pilih paket, lalu atur undanganmu sendiri kapan saja. Bayar sekali, tanpa langganan.',
      cta: 'Mulai Rancang Undangan',
      reassure: 'Bayar sekali, tanpa langganan bulanan',
    },
  },
  en: {
    hero: {
      kicker: 'FULL DEMO, NO SIGNUP',
      title: 'An invitation? More like a short film.',
      subtitle:
        'Guests scroll, and your story unfolds scene by scene — from the opening gate to the RSVP. Open the full demo now and see exactly what you get before deciding.',
      /* Single hero CTA. The old pair ("See the Full Demo" + "Browse Templates")
         both pointed at /#vibe, so the second one bought nothing. */
      ctaPrimary: 'Browse Templates',
      reassure: 'Pay once, no monthly subscription',
      /* {price} is filled from the cheapest live template_plans row — never hardcode. */
      priceFrom: 'From {price}',
    },
    trustBar: {
      label: 'Reasons to relax',
      oneTime: 'Pay once, not a subscription',
      payment: 'Secure payment via Midtrans',
      encrypted: 'Guest data encrypted',
      support: 'Ask anything on WhatsApp',
    },
    emotionalHook: {
      title: 'The first impression of your happiest moment.',
      body: 'This invitation link is the opening to your special occasion. Once opened, your photos, background music, and wedding storyline unfold interactively on every guest’s screen.',
    },
    vibeExploration: {
      heading: 'Try the Vibe, Right on This Page',
      subheading: 'Explore your choice of styles and colors right here.',
      templateEyebrow: 'Template',
      paletteLabel: 'Choose a palette',
      ambienceLabel: 'Ambience',
      viewLive: 'See the Real Invitation',
      previewOpen: 'Open the full invitation',
      previewHint: 'Free',
      previewHintFull: 'Free, no signup needed',
      previewClose: 'Close preview',
      previewNewTab: 'Open in new tab',
      previewLoading: 'Preparing the invitation…',
      viewPlans: 'View plans',
      buy: 'Buy Invitation',
      buyAlt: 'Check Your Price',
      popularBadge: 'Most popular',
      plansSubtitle: 'One-time payment — your invitation goes live, no monthly subscription.',
      plansTitle: 'Choose a plan',
      choosePlan: 'Choose this plan',
      guestQuota: '{n} guest invites',
      closePlans: 'Close',
      prevTemplate: 'Previous template',
      nextTemplate: 'Next template',
      previewNames: 'Rani & Adi',
      previewEyebrow: 'The Wedding Of',
      previewDate: 'December 20, 2026',
      byTemplate: {
        lovebirds: {
          tagline: 'Cinematic & warm',
          blurb: 'Polaroid photo cards, botanical animation, and a complete set of sections — RSVP, gift, gallery, and guestbook.',
        },
        solary: {
          tagline: 'Futuristic & bold',
          blurb: 'A 3D solar system, an inter-planet scroll journey, and a living palette switcher.',
        },
      },
    },
    features: {
      heading: 'Stunning Elegance, Flawless Management',
      subheading: 'RSVPs organize automatically, gift confirmations log neatly, and music plays seamlessly. That leaves you one job: enjoying the day.',
      items: [
        {
          title: 'RSVP & Guest Management',
          body: 'Attendance confirmations, guest counts, and personal wishes are logged automatically in your dashboard. No more manual tracking.',
        },
        {
          title: 'Background Music',
          body: 'Upload your chosen track to play automatically when guests open the invitation. A personal touch that creates a memorable atmosphere.',
        },
        {
          title: 'Gallery, Story & Digital Gift',
          body: 'Your love story on an interactive timeline, high-quality photo galleries, and gift transfer confirmations logged neatly for your designated accounts.',
        },
      ],
    },
    howItWorks: {
      heading: 'Just three steps',
      steps: [
        { title: 'Pick a template & plan', body: 'Open the full demo first, then choose the style and plan that fit your story best.' },
        { title: 'Pay once', body: 'A single payment opens the editor dashboard. No monthly subscription.' },
        { title: 'Add your story & share', body: 'Set photos, story, and event details yourself any time, then send the link over WhatsApp — track RSVPs in real time.' },
      ],
    },
    testimonials: {
      heading: 'Word From the Newlyweds',
      subheading: 'From couples whose invitations are already out in the world.',
      emptyHeading: 'Your story could be the first',
      emptyBody: 'No reviews are live yet. Create your invitation, live your big day with it, then be the first couple to share how it felt.',
      emptyCta: 'Start Designing',
    },
    faq: {
      heading: 'Questions that come up a lot',
      items: [
        {
          q: 'Can I see an example before paying?',
          a: 'Yes. A full demo of every template opens right on this page without signing up — exactly what guests would see, animations, RSVP, gallery and all. To fill in your own photos and story, the editor dashboard opens after payment.',
        },
        {
          q: 'How long does the invitation stay live?',
          a: 'It depends on the plan — some run for a set period, some stay live for good. If a period ends, the invitation can be renewed without losing RSVP or guest-book data.',
        },
        {
          q: 'Can it still be edited after the link is shared?',
          a: 'Yes. The dashboard stays open after the invitation goes live, so photos, timings, or the venue can change any time and appear instantly at the same link. Guests never need a new one.',
        },
        {
          q: 'What if there are more guests than the quota?',
          a: 'Guest quota can be topped up in blocks of 50 without creating a new invitation. Everything already collected stays intact.',
        },
        {
          q: 'Do guests need to install an app?',
          a: 'No. The invitation opens straight in a phone browser from an ordinary link, and shares over WhatsApp like any other message.',
        },
      ],
    },
    finalCta: {
      title: 'Ready to create yours?',
      subtitle: 'Open the full demo, pick a plan, then shape your invitation yourself any time. Pay once, no subscription.',
      cta: 'Start Your Invitation',
      reassure: 'Pay once, no monthly subscription',
    },
  },
}
