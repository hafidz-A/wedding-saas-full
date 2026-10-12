import dynamic from 'next/dynamic'

/* Songket section registry. Section TYPES and prop shapes mirror Lovebirds on
   purpose — the shared editor schemas, the gift-account encryption
   (src/lib/crypto/config.ts keys on `accountNumber`) and the RSVP/gift APIs all
   work unchanged. Only the visuals are new. `ssr: true` for the same CLS reason
   as Lovebirds. */
const section = (loader) => dynamic(loader, { ssr: true })

export const sectionRegistry = {
  hero:           section(() => import('./sections/Hero.jsx')),
  quote:          section(() => import('./sections/Quote.jsx')),
  brideGroom:     section(() => import('./sections/BrideGroom.jsx')),
  ourStory:       section(() => import('./sections/OurStory.jsx')),
  eventDetails:   section(() => import('./sections/EventDetails.jsx')),
  schedule:       section(() => import('./sections/Schedule.jsx')),
  galleryMasonry: section(() => import('./sections/Gallery.jsx')),
  weddingGift:    section(() => import('./sections/WeddingGift.jsx')),
  rsvp:           section(() => import('./sections/Rsvp.jsx')),
  footer:         section(() => import('./sections/Footer.jsx')),
}

export default sectionRegistry
