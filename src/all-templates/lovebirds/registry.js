import { lazy } from 'react'

/* Lovebirds section registry — maps each section `type` to its component.
   All lazy-loaded (code-split). Paths are relative to this template folder. */
export const sectionRegistry = {
  hero:              lazy(() => import('./sections/Hero/Hero.jsx')),
  countdown:         lazy(() => import('./sections/Countdown/Countdown.jsx')),
  ourStory:          lazy(() => import('./sections/OurStoryStack/OurStory.jsx')),
  eventDetails:      lazy(() => import('./sections/EventDetails/EventDetails.jsx')),
  brideGroom:        lazy(() => import('./sections/BrideGroom/BrideGroom.jsx')),
  weddingParty:      lazy(() => import('./sections/WeddingParty/WeddingParty.jsx')),
  galleryMasonry:    lazy(() => import('./sections/GalleryMasonry/index.js')),
  gallerySpringCoil: lazy(() => import('./sections/GallerySpringCoil/index.js')),
  schedule:          lazy(() => import('./sections/Schedule/Schedule.jsx')),
  rsvp:              lazy(() => import('./sections/Rsvp/Rsvp.jsx')),
  weddingGift:       lazy(() => import('./sections/WeddingGift/WeddingGift.jsx')),
  registry:          lazy(() => import('./sections/Registry/Registry.jsx')),
  accommodations:    lazy(() => import('./sections/Accommodations/Accommodations.jsx')),
  faq:               lazy(() => import('./sections/Faq/Faq.jsx')),
  guestbook:         lazy(() => import('./sections/Guestbook/Guestbook.jsx')),
  playlist:          lazy(() => import('./sections/Playlist/Playlist.jsx')),
  footer:            lazy(() => import('./sections/Footer/Footer.jsx')),
  blocks:            lazy(() => import('./sections/BlocksSection/BlocksSection.jsx')),
}

export default sectionRegistry
