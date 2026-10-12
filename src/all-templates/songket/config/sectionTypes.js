/* Section types Songket can render. Plain data (no components) so the editor
   schema registry and template policy can import it without pulling sections.
   registry.js must map every one of these — a test pins that. */
export const SONGKET_SECTION_TYPES = [
  'hero', 'quote', 'brideGroom', 'ourStory', 'eventDetails',
  'schedule', 'galleryMasonry', 'weddingGift', 'rsvp', 'footer',
]
