/* ============================================================
   pageConfig.js — SAAS-SHAPED config (data-driven, props-based)
   ------------------------------------------------------------
   Schema per section:
   { id, type, enabled, theme, navLabel, navHidden, props }

   All values prefixed [CONTOH] are sample data and can be edited
   freely. The renderer never imports this file directly — go
   through getConfig() (config/getConfig.js). That lets us swap
   to a fetch() backend later without touching components.
   ============================================================ */

export const pageConfig = {
  meta: {
    title: "Aruna & Daksa — A Galactic Wedding",            // [CONTOH]
    description: "An interstellar invitation. 02 · 14 · 2027.", // [CONTOH]
    locale: "id-ID",
    timezone: "Asia/Jakarta",
    slug: "demo",                                            // SaaS slug
  },

  /* Background music — path relative to /public. Audio popup
     in the OpeningGate respects autoplay policy. */
  audio: {
    src: "/audio/ambient.mp3",                               // [CONTOH] drop file in public/audio/
    enabledByDefault: false,
    volume: 0.45,
  },

  /* Defaults for the active visual palette. The runtime
     palette switcher overrides this. */
  theme: {
    defaultPalette: "cosmicDark",
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
        eyebrow: "An Interstellar Invitation",               // [CONTOH]
        coupleName: "Aruna  &  Daksa",                       // [CONTOH]
        tagline: "Two stars, one orbit. You are invited to witness a once-in-a-lifetime alignment.", // [CONTOH]
        ctaLabel: "Get Started",
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
        body: "A short prelude before the journey: who we are, where we met, and the gravity that pulled us together.", // [CONTOH]
        portrait: "https://picsum.photos/seed/aruna-daksa-portrait/800/1000", // [CONTOH] demo via picsum.photos
        portraitCaption: "Bali, 2023",                       // [CONTOH]
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
        heading: "A timeline written in starlight.",         // [CONTOH]
        timeline: [                                          // [CONTOH]
          {
            year: "2019",
            label: "First Orbit",
            desc: "We crossed paths at a friend's birthday in Bandung.",
            photos: [
              "https://picsum.photos/seed/first-orbit-1/600/600",
              "https://picsum.photos/seed/first-orbit-2/600/600",
            ],
          },
          {
            year: "2021",
            label: "Gravity",
            desc: "A long-distance year that pulled us closer, not apart.",
            photos: [],
          },
          {
            year: "2023",
            label: "Aligned",
            desc: "We moved to the same city. Coffee mornings became routine.",
            photos: [
              "https://picsum.photos/seed/aligned-1/600/600",
              "https://picsum.photos/seed/aligned-2/600/600",
              "https://picsum.photos/seed/aligned-3/600/600",
            ],
          },
          {
            year: "2025",
            label: "The Proposal",
            desc: "Under a meteor shower on Mount Bromo. She said yes.",
            photos: [
              "https://picsum.photos/seed/proposal-1/600/600",
            ],
          },
          {
            year: "2027",
            label: "The Wedding",
            desc: "And here we are — inviting you to our alignment.",
            photos: [
              "https://picsum.photos/seed/wedding-1/600/600",
              "https://picsum.photos/seed/wedding-2/600/600",
            ],
          },
        ],
      },
      schema: {
        heading:  { kind: "text" },
        timeline: { kind: "objectArray", fields: { year:"text", label:"text", desc:"textarea", photos:"imageArray" } },
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
        heading: "Four rings. Four eras of us.",            // [CONTOH]
        // 16–20 ring photos. Demo via picsum.photos (CORS-safe, deterministic by seed).
        photos: [                                            // [CONTOH]
          { src: "https://picsum.photos/seed/first-coffee/1200/1600",    caption: "First Coffee" },
          { src: "https://picsum.photos/seed/bandung-sunset/1200/1600",  caption: "Bandung Sunset" },
          { src: "https://picsum.photos/seed/beach-drive/1200/1600",     caption: "Beach Drive" },
          { src: "https://picsum.photos/seed/hiking-day/1200/1600",      caption: "Hiking Day" },
          { src: "https://picsum.photos/seed/movie-night/1200/1600",     caption: "Movie Night" },
          { src: "https://picsum.photos/seed/birthday-dinner/1200/1600", caption: "Birthday Dinner" },
          { src: "https://picsum.photos/seed/anniversary/1200/1600",     caption: "Anniversary" },
          { src: "https://picsum.photos/seed/sunrise-hike/1200/1600",    caption: "Sunrise Hike" },
          { src: "https://picsum.photos/seed/the-question/1200/1600",    caption: "The Question" },
          { src: "https://picsum.photos/seed/she-said-yes/1200/1600",    caption: "She Said Yes" },
          { src: "https://picsum.photos/seed/celebration/1200/1600",     caption: "Celebration" },
          { src: "https://picsum.photos/seed/venue-visit/1200/1600",     caption: "Venue Visit" },
          { src: "https://picsum.photos/seed/dress-fitting/1200/1600",   caption: "Dress Fitting" },
          { src: "https://picsum.photos/seed/cake-tasting/1200/1600",    caption: "Cake Tasting" },
          { src: "https://picsum.photos/seed/pre-wed-shoot/1200/1600",   caption: "Pre-wed Shoot" },
          { src: "https://picsum.photos/seed/family-brunch/1200/1600",   caption: "Family Brunch" },
          { src: "https://picsum.photos/seed/save-the-date/1200/1600",   caption: "Save the Date" },
          { src: "https://picsum.photos/seed/last-steps/1200/1600",      caption: "Last Steps" },
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
          { icon: "sparkle", label: "Dress",   primary: "Cosmic Black Tie",   secondary: "Deep tones, metallic accents welcome" },
          { icon: "car",     label: "Parking", primary: "Valet available",    secondary: "Complimentary for guests" },
        ],
        quote: "Wear what makes you feel like a constellation.",     // [CONTOH]
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
        heading: "Please confirm your orbit by 31 January.", // [CONTOH]
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
        heading: "The constellation by our side.",          // [CONTOH]
        groups: [                                            // [CONTOH]
          { label: "Bridesmaids", members: [
            { name: "Maya",  role: "Maid of Honor", avatar: "https://picsum.photos/seed/maya-bridesmaid/400/400" },
            { name: "Sasha", role: "Bridesmaid",    avatar: "https://picsum.photos/seed/sasha-bridesmaid/400/400" },
            { name: "Putri", role: "Bridesmaid",    avatar: "https://picsum.photos/seed/putri-bridesmaid/400/400" },
          ]},
          { label: "Groomsmen", members: [
            { name: "Rio",  role: "Best Man",  avatar: "https://picsum.photos/seed/rio-bestman/400/400" },
            { name: "Aldi", role: "Groomsman", avatar: "https://picsum.photos/seed/aldi-groomsman/400/400" },
            { name: "Bima", role: "Groomsman", avatar: "https://picsum.photos/seed/bima-groomsman/400/400" },
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
      navLabel: "Gifts & Wishes",
      props: {
        planetKey: "mercury",
        planetName: "Mercury",
        sectionLabel: "Gifts & Wishes",
        heading: "Your presence is the gift. But if you insist…", // [CONTOH]
        accounts: [                                          // [CONTOH]
          { bank: "BCA",     number: "1234567890", name: "Aruna K." },
          { bank: "Mandiri", number: "9876543210", name: "Daksa P." },
        ],
        wishesEnabled: true,
      },
      schema: {
        heading:  { kind: "text" },
        accounts: { kind: "objectArray", fields: { bank:"text", number:"text", name:"text" } },
        wishesEnabled: { kind: "boolean" },
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
        sectionLabel: "End of Transmission",
        heading: "Thank you for traveling with us.",        // [CONTOH]
        body: "We can't wait to share that day with you. Until then, walk well, dear traveller.", // [CONTOH]
        easterEggMessage: "We're so glad you came this far. We love you. ✦", // [CONTOH] — appears on sun click
        signature: "Made with light. Galactic Wedding Engine v3.0.",
      },
      schema: {
        heading: { kind: "text" },
        body:    { kind: "textarea" },
        easterEggMessage: { kind: "textarea" },
      },
    },
  ],
};

export default pageConfig;
