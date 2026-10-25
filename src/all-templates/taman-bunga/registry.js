/* Taman Bunga section registry: section type → the component that renders it.

   Unlike Lovebirds, the Shell does not loop over this map — the walk is one
   choreographed scene and the Shell places each section at its fixed beat. The
   map is the template's catalogue of section types (it must match the editor
   schemas in src/editor/schemas/taman-bunga). Client code — never import it
   from a server component. */
import { CoupleCards, EventsPanel, Gallery, QuotePanel, SaveDatePanel, StoryPanels } from './sections/Journey.jsx'
import { Closing, Cover, GiftSheet, RsvpSheet, WishesSheet } from './sections/Sheets.jsx'

export const sectionRegistry = {
  tbCover: Cover,
  tbQuote: QuotePanel,
  tbCouple: CoupleCards,
  tbStory: StoryPanels,
  tbSaveDate: SaveDatePanel,
  tbEvents: EventsPanel,
  tbGallery: Gallery,
  tbRsvp: RsvpSheet,
  guestbook: WishesSheet,
  tbGift: GiftSheet,
  tbClosing: Closing,
}

export default sectionRegistry
