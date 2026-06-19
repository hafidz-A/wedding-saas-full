/* ============================================================
   pageConfig.js — SAAS-SHAPED config (data-driven, props-based)
   ------------------------------------------------------------
   Schema per section:
   { id, type, enabled, theme, navLabel, navHidden, props }

   All values prefixed [CONTOH] are sample data and can be edited
   freely. The renderer never imports this file directly — go
   through getConfig() (config/getConfig.js). That lets us swap
   to a fetch() backend later without touching components.

   Visual direction: "starlit romance" (grounded). User-facing copy
   is timeless-wedding language; the planetKey/planetName fields stay
   for now because they bind to the 3D scene (engine softening is a
   separate, pending task). See docs/solary-visual-foundation.md v2.
   ============================================================ */

// Solary reuses the local Lovebirds photo set via solaryImg (drop-in for the
// shared demoImg; unmatched keys fall back to the Unsplash registry).
import { solaryImg as demoImg } from "../demoImages.js";

export const pageConfig = {
  meta: {
    title: "Aruna & Daksa — A Wedding Celebration",          // [CONTOH]
    description: "A wedding invitation. 02 · 14 · 2027.",     // [CONTOH]
    locale: "id-ID",
    timezone: "Asia/Jakarta",
    slug: "demo",                                            // SaaS slug
  },

  /* Background music — path relative to /public. Audio popup
     in the OpeningGate respects autoplay policy.
     src is null by default: /audio/ambient.mp3 never existed in public/,
     so the demo offered a music popup whose accept button played nothing
     (plus two 404s per visit). Real invitations set music.url instead. */
  audio: {
    src: null,                                               // [CONTOH] drop a file in public/audio/ and point here
    enabledByDefault: false,
    volume: 0.45,
  },

  /* Defaults for the active visual palette. The runtime
     palette switcher overrides this. Default is a warm, light,
     premium palette (Golden Champagne) per the grounded direction. */
  theme: {
    defaultPalette: "sunburstLight",
    paletteOptions: [
      "cosmicDark",
      "nebulaDark",
      "roseDark",
      "emeraldDark",
      "lavenderLight",
      "sunburstLight",
      "roseLight",
      "botanicalLight",
    ],
  },

  scene: {
    enabled: true,
    starfieldDensity: 8000,
    /* transitionVh = scroll runway antar planet. Lebih besar = travel
       lebih lambat & cinematic (mendekati 2.6s arrow-key camera arc).
       Sebelumnya 200vh → traversal scroll wheel terasa terlalu cepat. */
    transitionVh: 420,
    /* Lenis duration sedikit lebih panjang supaya scroll wheel input
       di-interpolate lebih deliberate. Tidak terlalu agresif supaya
       scroll dalam section (Uranus filmstrip) tetap responsif. */
    lenis: { duration: 1.5, smoothWheel: true },
  },

  /* SECTIONS — every section follows the SaaS schema.
     `props` carries content; everything else is metadata. */
  sections: [
    {
      id: "intro",
      type: "openingGate",
      enabled: true,
      theme: "cosmicDark",
      navLabel: "Welcome",
      navHidden: true,
      props: {
        planetKey: "andromeda",
        planetName: "Andromeda",
        eyebrow: "You Are Invited",                          // [CONTOH]
        coupleName: "Aruna  &  Daksa",                       // [CONTOH]
        tagline: "Two hearts, one story. You are invited to witness the beginning of our forever.", // [CONTOH]
        ctaLabel: "Get Started",
        gatePhotos: [
          demoImg("coupleClassic", 400),
          demoImg("coupleCasual", 400),
          demoImg("coupleSunset", 400),
        ],
      },
      schema: {
        eyebrow:    { kind: "text" },
        coupleName: { kind: "text" },
        tagline:    { kind: "textarea" },
        ctaLabel:   { kind: "text" },
      },
    },

    {
      id: "neptune",
      type: "welcomePlanet",
      enabled: true,
      theme: "cosmicDark",
      navLabel: "Welcome",
      props: {
        planetKey: "neptune",
        planetName: "Neptune",
        sectionLabel: "Welcome",
        heading: "We found each other in the deep blue.",    // [CONTOH]
        body: "A short prelude: who we are, where we met, and what drew us together.", // [CONTOH]
        portrait: demoImg("coupleClassic", 1000),            // [CONTOH] demo via Unsplash registry
        portraitCaption: "Bali, 2023",                       // [CONTOH]
        layout: "single",                                    // [CONTOH] "single" | "duo"
        portrait2: demoImg("coupleCasual", 1000),            // [CONTOH] used when layout="duo"
        portraitCaption2: "Jakarta, 2024",                   // [CONTOH]
      },
      schema: {
        heading:         { kind: "text" },
        body:            { kind: "textarea" },
        portrait:        { kind: "image" },
        portraitCaption: { kind: "text" },
      },
    },

    {
      id: "uranus",
      type: "storyPlanet",
      enabled: true,
      theme: "cosmicDark",
      navLabel: "Our Story",
      props: {
        planetKey: "uranus",
        planetName: "Uranus",
        sectionLabel: "Our Story",
        heading: "The story of us, year by year.",           // [CONTOH]
        timeline: [                                          // [CONTOH]
          {
            year: "2019",
            label: "First Meeting",
            desc: "We crossed paths at a friend's birthday in Bandung.",
            photo: demoImg("galleryBirthday", 600),
          },
          {
            year: "2021",
            label: "Miles Apart",
            desc: "A long-distance year that pulled us closer, not apart.",
            photo: demoImg("gallerySunsetWalk", 600),
          },
          {
            year: "2023",
            label: "Finally Together",
            desc: "We moved to the same city. Coffee mornings became routine.",
            photo: demoImg("galleryCoffee", 600),
          },
          {
            year: "2025",
            label: "The Proposal",
            desc: "Under a starlit sky on Mount Bromo. She said yes.",
            photo: demoImg("storyProposal", 600),
          },
          {
            year: "2027",
            label: "The Wedding",
            desc: "And here we are — inviting you to our wedding.",
            photo: demoImg("storyWedding", 600),
          },
        ],
      },
      schema: {
        heading:  { kind: "text" },
        timeline: { kind: "objectArray", fields: { year:"text", label:"text", desc:"textarea", photo:"image" } },
      },
    },

    {
      id: "saturn",
      type: "saturnRing",                                   // SPECIAL — 3D-perspective billboard ring
      enabled: true,
      theme: "nebulaDark",
      navLabel: "Gallery",
      props: {
        planetKey: "saturn",
        planetName: "Saturn",
        sectionLabel: "Gallery of Memories",
        heading: "A gallery of us — era by era.",           // [CONTOH]
        // 16–20 ring photos. Demo via the local Lovebirds illustration set
        // (solaryImg). Captions match what each illustration actually shows.
        photos: [                                            // [CONTOH]
          { src: demoImg("galleryCoffee", 1200),       caption: "Coffee Mornings" },
          { src: demoImg("gallerySunsetWalk", 1200),   caption: "Sunset Walk" },
          { src: demoImg("galleryRoadTrip", 1200),     caption: "The Open Road" },
          { src: demoImg("galleryHiking", 1200),       caption: "Beach Escape" },
          { src: demoImg("galleryMovieNight", 1200),   caption: "City Lights" },
          { src: demoImg("galleryBirthday", 1200),     caption: "Birthday Surprise" },
          { src: demoImg("galleryAnniversary", 1200),  caption: "A Toast Together" },
          { src: demoImg("gallerySunrise", 1200),      caption: "Sunrise Sky" },
          { src: demoImg("storyProposal", 1200),       caption: "The Proposal" },
          { src: demoImg("coupleGate", 1200),          caption: "Just the Two of Us" },
          { src: demoImg("galleryCelebration", 1200),  caption: "Our First Dance" },
          { src: demoImg("galleryVenue", 1200),        caption: "Picnic for Two" },
          { src: demoImg("galleryDressFitting", 1200), caption: "The Bride" },
          { src: demoImg("galleryCakeTasting", 1200),  caption: "Cooking Together" },
          { src: demoImg("galleryPreWedShoot", 1200),  caption: "Bonfire Nights" },
          { src: demoImg("galleryBrunch", 1200),       caption: "Where We Met" },
          { src: demoImg("groomPortrait", 1200),       caption: "The Groom" },
          { src: demoImg("galleryRings", 1200),        caption: "The Rings" },
        ],
      },
      schema: {
        heading: { kind: "text" },
        photos:  { kind: "objectArray", fields: { src:"image", caption:"text" } },
      },
    },

    {
      id: "jupiter",
      type: "countdownPlanet",
      enabled: true,
      theme: "cosmicDark",
      navLabel: "Save the Date",
      props: {
        planetKey: "jupiter",
        planetName: "Jupiter",
        sectionLabel: "Save the Date",
        heading: "02 · 14 · 2027",                          // [CONTOH]
        subheading: "Sunday · 16:00 WIB · Garden Pavilion", // [CONTOH]
        targetDate: "2027-02-14T16:00:00+07:00",            // [CONTOH]
        endDate: "2027-02-14T22:00:00+07:00",               // [CONTOH]
        venueName: "Plataran Menteng",                      // [CONTOH]
        venueAddress: "Jl. HOS Cokroaminoto 42, Jakarta",   // [CONTOH]
      },
      schema: {
        heading:    { kind: "text" },
        subheading: { kind: "text" },
        targetDate: { kind: "datetime" },
        endDate:    { kind: "datetime" },
        venueName:  { kind: "text" },
        venueAddress:{ kind: "text" },
      },
    },

    {
      id: "mars",
      type: "detailsPlanet",
      enabled: true,
      theme: "roseDark",
      navLabel: "Details",
      props: {
        planetKey: "mars",
        planetName: "Mars",
        sectionLabel: "The Details",
        heading: "Where, when, and what to wear.",          // [CONTOH]
        cards: [                                             // [CONTOH]
          { icon: "pin",     label: "Venue",   primary: "Plataran Menteng",   secondary: "Jl. HOS Cokroaminoto 42, Jakarta", actionLabel: "Open Map", actionHref: "#" },
          { icon: "clock",   label: "Time",    primary: "16:00 — 22:00 WIB",  secondary: "Doors open 15:30" },
          { icon: "sparkle", label: "Dress",   primary: "Garden Black Tie",   secondary: "Deep tones, metallic accents welcome" },
          { icon: "car",     label: "Parking", primary: "Valet available",    secondary: "Complimentary for guests" },
        ],
        quote: "Wear what makes you feel radiant.",                   // [CONTOH]
        quoteAttribution: "Dress code note from the couple",          // [CONTOH]
      },
      schema: {
        heading: { kind: "text" },
        cards:   { kind: "objectArray", fields: { icon:"select(pin,clock,sparkle,car)", label:"text", primary:"text", secondary:"text", actionLabel:"text", actionHref:"text" } },
        quote:   { kind: "textarea" },
      },
    },

    {
      id: "earth",
      type: "rsvpPlanet",
      enabled: true,
      theme: "emeraldDark",
      navLabel: "RSVP",
      props: {
        planetKey: "earth",
        planetName: "Earth",
        sectionLabel: "RSVP",
        heading: "Please confirm your attendance by 31 January.", // [CONTOH]
        deadline: "2027-01-31",                              // [CONTOH]
        whatsappNumber: "+62 812-1234-5678",                 // [CONTOH]
        menuOptions: ["Nusantara", "Mediterranean", "Vegetarian"], // [CONTOH]
      },
      schema: {
        heading:        { kind: "text" },
        deadline:       { kind: "datetime" },
        whatsappNumber: { kind: "text" },
        menuOptions:    { kind: "objectArray", fields: { value:"text" } },
      },
    },

    {
      id: "venus",
      type: "teamPlanet",
      enabled: true,
      theme: "cosmicDark",
      navLabel: "Bridal Party",
      props: {
        planetKey: "venus",
        planetName: "Venus",
        sectionLabel: "Bridal Party",
        heading: "The dearest people by our side.",          // [CONTOH]
        groups: [                                            // [CONTOH]
          { label: "Bridesmaids", members: [
            { name: "Maya",  role: "Maid of Honor", avatar: demoImg("partyMaidOfHonor", 400) },
            { name: "Sasha", role: "Bridesmaid",    avatar: demoImg("partyBridesmaid2", 400) },
            { name: "Putri", role: "Bridesmaid",    avatar: demoImg("partyBridesmaid3", 400) },
          ]},
          { label: "Groomsmen", members: [
            { name: "Rio",  role: "Best Man",  avatar: demoImg("partyBestMan", 400) },
            { name: "Aldi", role: "Groomsman", avatar: demoImg("partyGroomsman2", 400) },
            { name: "Bima", role: "Groomsman", avatar: demoImg("partyGroomsman3", 400) },
          ]},
        ],
      },
      schema: {
        heading: { kind: "text" },
        groups:  { kind: "objectArray", fields: { label:"text", members:"objectArray" } },
      },
    },

    {
      id: "mercury",
      type: "giftPlanet",
      enabled: true,
      theme: "nebulaDark",
      navLabel: "Gifts",
      props: {
        planetKey: "mercury",
        planetName: "Mercury",
        sectionLabel: "Gifts",
        heading: "Your presence is the gift. But if you insist…", // [CONTOH]
        accounts: [                                          // [CONTOH]
          { bank: "BCA",     number: "1234567890", name: "Aruna K." },
          { bank: "Mandiri", number: "9876543210", name: "Daksa P." },
        ],
        confirmationEnabled: true,
      },
      schema: {
        heading:  { kind: "text" },
        accounts: { kind: "objectArray", fields: { bank:"text", number:"text", name:"text" } },
        confirmationEnabled: { kind: "boolean" },
      },
    },

    {
      id: "sun",
      type: "footerPlanet",
      enabled: true,
      theme: "nebulaDark",
      navLabel: "End",
      navHidden: true,
      props: {
        planetKey: "sun",
        planetName: "Sun",
        sectionLabel: "With Love",
        heading: "Thank you for celebrating with us.",       // [CONTOH]
        body: "We can't wait to share that day with you. Until then, with all our love.", // [CONTOH]
        easterEggMessage: "We're so glad you came this far. We love you. ✦", // [CONTOH] — appears on sun click
        signature: "Made with love.",
        photoFramesEnabled: true, // tilted photo frames behind the closing text
      },
      schema: {
        heading: { kind: "text" },
        body:    { kind: "textarea" },
        easterEggMessage: { kind: "textarea" },
        signature: { kind: "text" },
        photoFramesEnabled: { kind: "boolean" },
      },
    },
  ],
};

export default pageConfig;
