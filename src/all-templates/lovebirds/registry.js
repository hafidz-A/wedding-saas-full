import { lazy } from 'react'

/* Lovebirds section registry — maps each section `type` to its component.
   All lazy-loaded (code-split). Paths are relative to this template folder. */
export const sectionRegistry = {
  hero:              lazy(() => import('./sections/Hero/Hero.jsx')),
  quote:             lazy(() => import('./sections/Quote/Quote.jsx')),
  ourStory:          lazy(() => import('./sections/OurStoryStack/OurStory.jsx')),
  eventDetails:      lazy(() => import('./sections/EventDetails/EventDetails.jsx')),
  brideGroom:        lazy(() => import('./sections/BrideGroom/BrideGroom.jsx')),
  weddingParty:      lazy(() => import('./sections/WeddingParty/WeddingParty.jsx')),
  galleryMasonry:    lazy(() => import('./sections/GalleryMasonry/index.js')),
  gallerySpringCoil: lazy(() => import('./sections/GallerySpringCoil/index.js')),
  schedule:          lazy(() => import('./sections/Schedule/Schedule.jsx')),
  rsvp:              lazy(() => import('./sections/Rsvp/Rsvp.jsx')),
  weddingGift:       lazy(() => import('./sections/WeddingGift/WeddingGift.jsx')),
  accommodations:    lazy(() => import('./sections/Accommodations/Accommodations.jsx')),
  faq:               lazy(() => import('./sections/Faq/Faq.jsx')),
  playlist:          lazy(() => import('./sections/Playlist/Playlist.jsx')),
  footer:            lazy(() => import('./sections/Footer/Footer.jsx')),
  blocks:            lazy(() => import('./sections/BlocksSection/BlocksSection.jsx')),
  // `countdown`, `registry`, `guestbook` removed from lovebirds — registry is
  // folded into Wedding Gift; guestbook + countdown dropped (see migrate-lovebirds).
}

export default sectionRegistry
