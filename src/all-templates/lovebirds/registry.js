import dynamic from 'next/dynamic'

/* Lovebirds section registry — maps each section `type` to its component.
   Code-split via next/dynamic with `ssr: true`: each section is still its own
   chunk, but it is ALSO server-rendered into the initial HTML. That removes the
   React.lazy "60vh skeleton → real (taller) section" swap that was firing ~2.7s
   after load and producing a catastrophic CLS (~1.07). SSR also puts the real
   content in the HTML (better SEO). Paths are relative to this template folder. */
const section = (loader) => dynamic(loader, { ssr: true })

export const sectionRegistry = {
  hero:              section(() => import('./sections/Hero/Hero.jsx')),
  quote:             section(() => import('./sections/Quote/Quote.jsx')),
  ourStory:          section(() => import('./sections/OurStoryStack/OurStory.jsx')),
  eventDetails:      section(() => import('./sections/EventDetails/EventDetails.jsx')),
  brideGroom:        section(() => import('./sections/BrideGroom/BrideGroom.jsx')),
  weddingParty:      section(() => import('./sections/WeddingParty/WeddingParty.jsx')),
  galleryMasonry:    section(() => import('./sections/GalleryMasonry/index.js')),
  gallerySpringCoil: section(() => import('./sections/GallerySpringCoil/index.js')),
  schedule:          section(() => import('./sections/Schedule/Schedule.jsx')),
  rsvp:              section(() => import('./sections/Rsvp/Rsvp.jsx')),
  weddingGift:       section(() => import('./sections/WeddingGift/WeddingGift.jsx')),
  accommodations:    section(() => import('./sections/Accommodations/Accommodations.jsx')),
  faq:               section(() => import('./sections/Faq/Faq.jsx')),
  footer:            section(() => import('./sections/Footer/Footer.jsx')),
  blocks:            section(() => import('./sections/BlocksSection/BlocksSection.jsx')),
  // `countdown`, `registry`, `guestbook` removed from lovebirds — registry is
  // folded into Wedding Gift; guestbook + countdown dropped (see migrate-lovebirds).
}

export default sectionRegistry
