/* Musi section registry: section type → the component that renders it.

   Like Taman Bunga, the Shell does not loop over this map — the journey is one
   choreographed scene and the Shell places each section at its fixed beat. The
   map is the template's catalogue of section types (it must match the editor
   schemas in src/editor/schemas/musi). Client code — never import it from a
   server component. */
import { CoupleCards, EventsPanel, GalleryPanel, QuotePanel, SaveDatePanel, StoryPanels } from './sections/Journey.jsx'
import { Closing, Cover, GiftSheet, RsvpSheet, WishesSheet } from './sections/Sheets.jsx'

export const sectionRegistry = {
  musiCover: Cover,
  musiQuote: QuotePanel,
  musiCouple: CoupleCards,
  musiStory: StoryPanels,
  musiSaveDate: SaveDatePanel,
  musiEvents: EventsPanel,
  musiGallery: GalleryPanel,
  musiRsvp: RsvpSheet,
  guestbook: WishesSheet,
  musiGift: GiftSheet,
  musiClosing: Closing,
}

export default sectionRegistry
