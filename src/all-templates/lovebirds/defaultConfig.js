/* ============================================================================
   PAGE CONFIG — single source of truth for the homepage

   The whole site is rendered dynamically from `sections` below. To customize:

     ▸ Remove a section    → delete its entry from the array
     ▸ Hide a section      → set `enabled: false`
     ▸ Reorder sections    → move the entry up/down in the array
     ▸ Change theme        → set `theme: 'darkLuxury' | 'warmCream' | …`
     ▸ Change background   → set `background: { type, value }`
     ▸ Edit content        → modify the `props` object
     ▸ Add blocks          → push to `blocks: []` (for block-composed sections)
     ▸ Add new section     → register its component in sectionRegistry.js first,
                              then push a new entry here with the matching `type`

   Schema:
     {
       id:          unique stable key
       type:        matches a key in sectionRegistry
       enabled:     boolean (false = skipped)
       theme:       optional theme preset name (themes.js)
       background:  optional { type: 'gradient' | 'solid' | 'image', value }
       layout:      optional layout hint ('centered' | 'split' | …)
       decorativeLayers: optional array of decorative blocks
       props:       data passed to the section component (specialized sections)
       blocks:      optional array of blocks (for block-composed sections)
     }
   ============================================================================ */

// Calculate a dynamic future date for the demo so the countdown is always active and counting down
const now = new Date()
// Target next year if we are already past November 15th of the current year
const targetYear = (now.getMonth() > 10 || (now.getMonth() === 10 && now.getDate() >= 15))
  ? now.getFullYear() + 1
  : now.getFullYear()

const demoWeddingDate = `${targetYear}-11-15T16:00:00`
const demoWeddingDateWithOffset = `${targetYear}-11-15T16:00:00+07:00`
const demoWeddingDateText = `15 November ${targetYear}`
const demoWeddingDateFullText = `Saturday, 15 November ${targetYear}`
const demoRsvpDateText = `Kindly respond by 1 November ${targetYear}`

export const defaultConfig = {
  meta: {
    title: 'Rizky & Amara — Our Wedding',
    description: 'Cinematic wedding invitation experience',
  },

  // WhatsApp invite message template — used by the Guests tab to render
  // `wa.me` links. Placeholders: {{name}}, {{url}}. Each couple can edit
  // this from the dashboard editor; this is the default for new accounts.
  inviteMessageTemplate:
    'Halo {{name}},\n\nDengan hormat kami mengundang Anda untuk hadir di acara pernikahan kami. ' +
    'Detail lengkap & RSVP di tautan berikut:\n\n{{url}}\n\nTerima kasih 🙏',

  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      theme: 'darkLuxury',
      props: {
        coupleName: 'Rizky & Amara',
        brideName: 'Amara',
        groomName: 'Rizky',
        weddingDate: demoWeddingDate,
        venue: 'The Grand Ballroom, Jakarta',
        welcomeText: 'Welcome, our dear guest',
        scrollHint: 'Scroll to enter',
        countdownEnabled: true,
        gateImage:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
        blastPhotos: [
          'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1542042161784-26ab9e041e2e?auto=format&fit=crop&w=500&q=80',
        ],
        petals: ['coral', 'gold', 'emerald', 'gold', 'purple', 'coral', 'emerald', 'gold'],
      },
    },

    {
      id: 'countdown',
      type: 'countdown',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Countdown',
      props: {
        weddingDate: demoWeddingDateWithOffset,
        eyebrow: 'Save the date',
        title: 'Menuju Hari Bahagia',
        subtitle: 'Hitung mundur sampai janji suci diucapkan',
        messageDuring: 'Hari ini, kami menikah! 💍',
        messageAfter: 'Terima kasih telah menjadi bagian dari kisah kami.',
        labels: { days: 'Hari', hours: 'Jam', minutes: 'Menit', seconds: 'Detik' },
        style: 'card',
        calendarEnabled: true,
        calendarLabel: 'Tambah ke Kalender',
        calendarTitle: 'Pernikahan Rizky & Amara',
        calendarLocation: 'The Grand Ballroom, Jakarta',
        calendarDescription: 'Akad nikah & resepsi. Mohon kehadirannya.',
        calendarDurationHours: 4,
      },
    },

    {
      id: 'ourStory',
      type: 'ourStory',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Our Story',
        // `stories` shape — used by OurStoryStack (scroll-stacking deck).
        // Both `stories` and `cards` accepted by the component (backward-compat).
        stories: [
          {
            id: 'card-1',
            year: '2020',
            date: '14 February 2020',
            title: 'The First Meeting',
            description:
              'A quiet evening by the sea, where laughter became the language we both understood without saying a single word.',
            image:
              'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
          },
          {
            id: 'card-2',
            year: '2021',
            date: '22 June 2021',
            title: 'Our First Date',
            description:
              'Bonfires, salty wind, and the sky turning gold — we knew this was the start of something we would never forget.',
            image:
              'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?auto=format&fit=crop&w=1400&q=80',
          },
          {
            id: 'card-3',
            year: '2022',
            date: '15 December 2022',
            title: 'Our Holiday Together',
            description:
              'Silly hats, shared snacks, and the kind of joy you only get when home is wherever the other person is.',
            image:
              'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1400&q=80',
          },
          {
            id: 'card-4',
            year: '2024',
            date: '08 March 2024',
            title: 'The Proposal',
            description:
              'A single quiet question on a slow Sunday — answered with tears, laughter, and a yes that has not stopped ringing since.',
            image:
              'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1400&q=80',
          },
          {
            id: 'card-5',
            year: String(targetYear),
            date: demoWeddingDateText,
            title: 'The Wedding Day',
            description:
              'And here we are — surrounded by the people we love, ready to begin the next chapter of our story together.',
            image:
              'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1400&q=80',
          },
        ],
      },
    },

    {
      id: 'eventDetails',
      type: 'eventDetails',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Event Details',
        subtitle: 'Join us as we celebrate the beginning of forever',
        events: [
          {
            id: 'ceremony',
            label: 'Ceremony',
            icon: 'rings',
            date: demoWeddingDateFullText,
            time: '16:00 — 17:30',
            location: 'St. Mary Chapel, Jakarta',
            accent: 'coral',
          },
          {
            id: 'reception',
            label: 'Reception',
            icon: 'champagne',
            date: demoWeddingDateFullText,
            time: '19:00 — 23:00',
            location: 'The Grand Ballroom, Jakarta',
            accent: 'emerald',
          },
          {
            id: 'dress-code',
            label: 'Dress Code',
            icon: 'sparkle',
            date: 'Formal · Black Tie Optional',
            time: 'Earth tones encouraged',
            location: 'Coral, gold, emerald — pick your shade',
            accent: 'gold',
          },
        ],
        mapEmbed:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.387!2d106.8273!3d-6.1944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMTEnMzkuOCJTIDEwNsKwNDknNDQuMyJF!5e0!3m2!1sen!2sid!4v0000000000000',
      },
    },

    {
      id: 'brideGroom',
      type: 'brideGroom',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'The Bride & Groom',
        people: [
          {
            role: 'Bride',
            name: 'Amara Sastrawijaya',
            photo: 'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=800&q=80',
            parents: 'Daughter of Mr. & Mrs. Sastrawijaya',
            bio: 'A daughter, a dreamer, a designer of warm spaces and warmer conversations. Born in Bandung, in love with quiet mornings.',
            instagram: '@amara.s',
            direction: 'right',
          },
          {
            role: 'Groom',
            name: 'Rizky Pratama',
            photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
            parents: 'Son of Mr. & Mrs. Pratama',
            bio: 'A son, a builder, a believer in slow Sundays. Born in Jakarta, made better by every shared meal with Amara.',
            instagram: '@rizky.p',
            direction: 'left',
          },
        ],
      },
    },

    {
      id: 'weddingParty',
      type: 'weddingParty',
      enabled: false,
      theme: 'warmCream',
      props: {
        title: 'Wedding Party',
        subtitle: 'The people who make our story brighter',
        people: [
          { id: 'p1', name: 'Maya Larasati', role: 'Maid of Honor', photo: '' },
          { id: 'p2', name: 'Dimas Aji', role: 'Best Man', photo: '' },
          { id: 'p3', name: 'Sari Wulandari', role: 'Bridesmaid', photo: '' },
          { id: 'p4', name: 'Bagas Permana', role: 'Groomsman', photo: '' },
        ],
      },
    },

    {
      id: 'galleryMasonry',
      type: 'galleryMasonry',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Gallery',
      props: {
        eyebrow: 'Our Moments',
        sectionTitle: 'Memories',
        sectionSubtitle: 'A small collection of our favorite memories together',
        photos: [
          { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80', alt: 'The proposal' },
          { src: 'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=600&q=80', alt: 'Just us' },
          { src: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=600&q=80', alt: 'Birthday surprise' },
          { src: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80', alt: 'Our wedding' },
          { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80', alt: 'Lazy Sunday' },
          { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80', alt: 'Road trip' },
          { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80', alt: 'Holiday together' },
          { src: 'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?auto=format&fit=crop&w=600&q=80', alt: 'First date' },
          { src: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=600&q=80', alt: 'Coffee mornings' },
          { src: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=600&q=80', alt: 'City lights' },
          { src: 'https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=600&q=80', alt: 'Sunset walk' },
          { src: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80', alt: 'The proposal 2' },
          { src: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=600&q=80', alt: 'First holiday' },
          { src: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?auto=format&fit=crop&w=600&q=80', alt: 'Cooking together' },
          { src: 'https://images.unsplash.com/photo-1542042161784-26ab9e041e2e?auto=format&fit=crop&w=600&q=80', alt: 'Family dinner' },
          { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=600&q=80', alt: 'First dance' },
        ],
      },
    },

    {
      // Spring Coil gallery with GSAP ScrollTrigger `pin: true`.
      // Toggle `enabled: true/false` to enable or disable scroll hijacking.
      // Keep the other gallery variants above disabled to avoid duplicates.
      id: 'gallerySpringCoil',
      type: 'gallerySpringCoil',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Coil',
      props: {
        sectionTitle: 'Moments',
        sectionSubtitle: 'Memori kami menjalin dalam spiral kenangan',
        photos: [
          { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80', caption: 'The proposal'      },
          { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80', caption: 'A road trip'        },
          { src: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=80', caption: 'First holiday'      },
          { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80', caption: 'Lazy Sunday'        },
          { src: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?auto=format&fit=crop&w=900&q=80', caption: 'Cooking together'  },
          { src: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=900&q=80', caption: 'Coffee mornings'   },
          { src: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=900&q=80', caption: 'Birthday surprise' },
          { src: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=900&q=80', caption: 'City lights'       },
          { src: 'https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=900&q=80', caption: 'Sunset walk'       },
          { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80', caption: 'Family dinner'     },
          { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80', caption: 'First dance'       },
          { src: 'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=900&q=80', caption: 'Just us'           },
        ],
      },
    },

    {
      id: 'schedule',
      type: 'schedule',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Schedule of the Day',
        subtitle: 'A gentle guide so you never miss a moment',
        events: [
          { id: 's1', time: '15:30', title: 'Guest Arrival',       description: 'Welcome drinks and live acoustic music on the terrace.',      accent: 'coral',   icon: 'door'    },
          { id: 's2', time: '16:00', title: 'Ceremony',            description: 'The exchange of vows beneath an arch of fresh flowers.',     accent: 'emerald', icon: 'rings'   },
          { id: 's3', time: '17:00', title: 'Photo Session',       description: 'Family portraits — please stay close after the ceremony.',  accent: 'gold',    icon: 'camera'  },
          { id: 's4', time: '18:00', title: 'Cocktail Hour',       description: 'Hand-crafted drinks and small bites in the garden.',        accent: 'sky',     icon: 'glass'   },
          { id: 's5', time: '19:00', title: 'Dinner Reception',    description: 'A four-course meal followed by speeches and toasts.',       accent: 'purple',  icon: 'plate'   },
          { id: 's6', time: '21:00', title: 'First Dance & Party', description: 'Music, dancing, and dessert until the late hour.',          accent: 'coral',   icon: 'music'   },
          { id: 's7', time: '23:00', title: 'Send Off',            description: 'Sparklers and goodbyes — a sweet end to a beautiful day.',  accent: 'emerald', icon: 'sparkle' },
        ],
      },
    },

    {
      id: 'rsvp',
      type: 'rsvp',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Will You Join Us?',
        subtitle: demoRsvpDateText,
        mealOptions: [
          { value: 'beef',       label: 'Beef Tenderloin'     },
          { value: 'fish',       label: 'Pan-Seared Fish'     },
          { value: 'vegetarian', label: 'Garden Vegetarian'   },
          { value: 'vegan',      label: 'Vegan Option'        },
          { value: 'kids',       label: 'Kids Plate'          },
        ],
        maxGuests: 5,
      },
    },

    {
      id: 'weddingGift',
      type: 'weddingGift',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Gift',
      props: {
        title: 'Wedding Gift',
        subtitle: 'Tanda kasih untuk perjalanan kami berikutnya',
        intro:
          'Kehadiran Anda adalah hadiah terbesar bagi kami. Namun bila Anda berkenan memberikan tanda kasih, kami menyediakan beberapa opsi berikut.',
        confirmationEnabled: true,
        accounts: [
          {
            id: 'bca-amara',
            type: 'bank',
            name: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Amara Sastrawijaya',
            accent: 'coral',
          },
          {
            id: 'mandiri-rizky',
            type: 'bank',
            name: 'Mandiri',
            accountNumber: '1450098876543',
            accountHolder: 'Rizky Pratama',
            accent: 'emerald',
          },
          {
            id: 'ovo-amara',
            type: 'ewallet',
            name: 'OVO',
            accountNumber: '0812-3456-7890',
            accountHolder: 'Amara Sastrawijaya',
            accent: 'purple',
          },
        ],
        giftAddress:
          'Untuk kado fisik, mohon kirimkan ke alamat: Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan 12190 — atas nama Rizky Pratama (+62 812 0000 0000).',
      },
    },

    {
      id: 'registry',
      type: 'registry',
      enabled: false,
      theme: 'warmCream',
      props: {
        title: 'Wedding Registry',
        message:
          'Your presence is the greatest gift of all — but if you wish to contribute, here are a few places we have curated together.',
        platforms: [
          { id: 'r1', name: 'Tokopedia Wishlist', description: 'Home essentials for our new apartment.', url: '#', accent: 'coral'   },
          { id: 'r2', name: 'Honeymoon Fund',     description: 'Help us explore Kyoto in spring.',       url: '#', accent: 'purple'  },
          { id: 'r3', name: 'Charity in Lieu',    description: 'Donate to the Indonesia Mengajar foundation.', url: '#', accent: 'emerald' },
        ],
      },
    },

    {
      id: 'accommodations',
      type: 'accommodations',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Where to Stay',
        subtitle: 'A few favorites for our out-of-town guests',
        hotels: [
          {
            id: 'h1',
            name: 'Hotel Indonesia Kempinski',
            distance: '0.4 km',
            description: 'Five-star luxury directly across from the venue.',
            price: 'From IDR 3.500.000 / night',
            phone: '+62 21 2358 3838',
            tag: 'Luxury',
          },
          {
            id: 'h2',
            name: 'Pullman Jakarta Indonesia',
            distance: '1.1 km',
            description: 'Modern comfort with a beautiful rooftop pool.',
            price: 'From IDR 2.100.000 / night',
            phone: '+62 21 3192 1111',
            tag: 'Mid-range',
          },
          {
            id: 'h3',
            name: 'Artotel Thamrin',
            distance: '1.6 km',
            description: 'Boutique art-themed rooms, a fun and walkable option.',
            price: 'From IDR 1.200.000 / night',
            phone: '+62 21 3193 5555',
            tag: 'Boutique',
          },
        ],
        tips: [
          { id: 't1', icon: 'plane', text: 'Soekarno-Hatta Intl. Airport (CGK) is about 45 minutes from the venue.' },
          { id: 't2', icon: 'car',   text: 'Grab and Gojek are reliable and inexpensive — keep the app installed.' },
          { id: 't3', icon: 'sun',   text: 'November is mild and humid; bring a light umbrella just in case.'      },
        ],
      },
    },

    {
      id: 'faq',
      type: 'faq',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Questions, Answered',
        subtitle: 'A few things our friends keep asking',
        items: [
          { id: 'f1', q: 'Can I bring a plus one?',                a: 'We are keeping the guest list intimate. If your invitation includes a plus one, it will be listed on the RSVP page.' },
          { id: 'f2', q: 'Is parking available at the venue?',     a: 'Yes — complimentary valet parking is provided for all guests on the evening of the wedding.' },
          { id: 'f3', q: 'Will there be a kids menu?',             a: 'Absolutely. Please indicate a kids plate on the RSVP form so we can prepare a special meal.' },
          { id: 'f4', q: 'What time should I arrive?',             a: 'We recommend arriving at 15:30 for welcome drinks. The ceremony begins at 16:00 sharp.' },
          { id: 'f5', q: 'Is the venue accessible?',               a: 'Yes. The venue is fully wheelchair accessible with step-free access from the lobby to the ballroom.' },
          { id: 'f6', q: 'Can I take photos during the ceremony?', a: 'We kindly ask that phones be put away during the ceremony — our photographer will share images afterwards.' },
        ],
      },
    },

    {
      id: 'guestbook',
      type: 'guestbook',
      enabled: false,
      theme: 'warmCream',
      props: {
        title: 'Leave a Note',
        subtitle: 'A digital guestbook of wishes from the people we love',
        initialNotes: [
          { id: 'n1', name: 'Maya',  message: 'So happy for you both — cannot wait for the big day!', color: 'gold'  },
          { id: 'n2', name: 'Dimas', message: 'Brother, you found a gem. Cheers to forever.',         color: 'sky'   },
          { id: 'n3', name: 'Sari',  message: 'My heart is so full. Sending all the love.',           color: 'coral' },
        ],
      },
    },

    {
      id: 'playlist',
      type: 'playlist',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Build the Playlist',
        subtitle: 'What song would get you on the dance floor?',
        initialSongs: [
          { id: 'pl1', song: 'Perfect',              artist: 'Ed Sheeran'           },
          { id: 'pl2', song: 'September',            artist: 'Earth, Wind & Fire'   },
          { id: 'pl3', song: 'Mendung Tanpo Udan',   artist: 'Ndarboy Genk'         },
        ],
      },
    },

    {
      id: 'footer',
      type: 'footer',
      enabled: true,
      theme: 'warmCream',
      props: {
        monogram: 'R & A',
        hashtag: '#RizkyAndAmara',
        message: 'Thank you for being part of our story.',
        coupleName: 'Rizky & Amara',
        socials: [
          { id: 's-ig',   label: 'Instagram', url: '#'                          },
          { id: 's-mail', label: 'Email',     url: 'mailto:hello@rizkyamara.id' },
          { id: 's-spot', label: 'Spotify',   url: '#'                          },
        ],
      },
    },
  ],
}

export default defaultConfig
