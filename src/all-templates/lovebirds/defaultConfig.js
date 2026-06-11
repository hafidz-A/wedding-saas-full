/* Default page config — bundled demo data, rendered when no Supabase row exists. */

import { demoImg } from '../../lib/demoImages.js'

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
    title: 'Amara & Rizky — Our Wedding',
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
        coupleName: 'Amara & Rizky',
        brideName: 'Amara',
        groomName: 'Rizky',
        weddingDate: demoWeddingDate,
        venue: 'The Grand Ballroom, Jakarta',
        welcomeText: 'Welcome, our dear guest',
        scrollHint: 'Scroll to enter',
        countdownEnabled: true,
        gateImage: demoImg('coupleGate', 2000),
        blastPhotos: [
          demoImg('bridePortrait', 500),
          demoImg('storyWedding', 500),
          demoImg('storyFirstMeet', 500),
          demoImg('coupleClassic', 500),
          demoImg('galleryRoadTrip', 500),
          demoImg('galleryFirstDance', 500),
          demoImg('galleryCoffee', 500),
          demoImg('galleryFamilyDinner', 500),
        ],
        petals: ['coral', 'gold', 'emerald', 'gold', 'purple', 'coral', 'emerald', 'gold'],
      },
    },

    {
      id: 'quote',
      type: 'quote',
      enabled: true,
      theme: 'warmCream',
      props: {
        text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
        attribution: 'QS Ar-Rum: 21',
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
            image: demoImg('storyFirstMeet', 1400),
          },
          {
            id: 'card-2',
            year: '2021',
            date: '22 June 2021',
            title: 'Our First Date',
            description:
              'Bonfires, salty wind, and the sky turning gold — we knew this was the start of something we would never forget.',
            image: demoImg('storyFirstDate', 1400),
          },
          {
            id: 'card-3',
            year: '2022',
            date: '15 December 2022',
            title: 'Our Holiday Together',
            description:
              'Silly hats, shared snacks, and the kind of joy you only get when home is wherever the other person is.',
            image: demoImg('storyHoliday', 1400),
          },
          {
            id: 'card-4',
            year: '2024',
            date: '08 March 2024',
            title: 'The Proposal',
            description:
              'A single quiet question on a slow Sunday — answered with tears, laughter, and a yes that has not stopped ringing since.',
            image: demoImg('storyProposal', 1400),
          },
          {
            id: 'card-5',
            year: String(targetYear),
            date: demoWeddingDateText,
            title: 'The Wedding Day',
            description:
              'And here we are — surrounded by the people we love, ready to begin the next chapter of our story together.',
            image: demoImg('storyWedding', 1400),
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
            photo: demoImg('bridePortrait', 800),
            parents: 'Daughter of Mr. & Mrs. Sastrawijaya',
            bio: 'A daughter, a dreamer, a designer of warm spaces and warmer conversations. Born in Bandung, in love with quiet mornings.',
            instagram: '@amara.s',
            direction: 'right',
          },
          {
            role: 'Groom',
            name: 'Rizky Pratama',
            photo: demoImg('groomPortrait', 800),
            parents: 'Son of Mr. & Mrs. Pratama',
            bio: 'A son, a builder, a believer in slow Sundays. Born in Jakarta, made better by every shared meal with Amara.',
            instagram: '@rizky.p',
            direction: 'left',
          },
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
          { src: demoImg('storyProposal', 600),       alt: 'The proposal' },
          { src: demoImg('coupleCasual', 600),        alt: 'Just us' },
          { src: demoImg('galleryBirthday', 600),     alt: 'Birthday surprise' },
          { src: demoImg('coupleClassic', 600),       alt: 'Our wedding' },
          { src: demoImg('gallerySunrise', 600),      alt: 'Lazy Sunday' },
          { src: demoImg('galleryRoadTrip', 600),     alt: 'Road trip' },
          { src: demoImg('storyHoliday', 600),        alt: 'Holiday together' },
          { src: demoImg('storyFirstDate', 600),      alt: 'First date' },
          { src: demoImg('galleryCoffee', 600),       alt: 'Coffee mornings' },
          { src: demoImg('galleryCityLights', 600),   alt: 'City lights' },
          { src: demoImg('gallerySunsetWalk', 600),   alt: 'Sunset walk' },
          { src: demoImg('galleryRings', 600),        alt: 'The rings' },
          { src: demoImg('galleryBeach', 600),        alt: 'First holiday' },
          { src: demoImg('galleryCooking', 600),      alt: 'Cooking together' },
          { src: demoImg('galleryFamilyDinner', 600), alt: 'Family dinner' },
          { src: demoImg('galleryFirstDance', 600),   alt: 'First dance' },
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
      id: 'footer',
      type: 'footer',
      enabled: true,
      theme: 'warmCream',
      props: {
        monogram: 'A & R',
        hashtag: '#AmaraAndRizky',
        message: 'Thank you for being part of our story.',
        coupleName: 'Amara & Rizky',
        // Two photos shown as tilted polaroids below the monogram (bride, groom).
        photos: [
          { src: demoImg('bridePortrait', 600), alt: 'Amara' },
          { src: demoImg('groomPortrait', 600), alt: 'Rizky' },
        ],
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
