import type { SectionSchema } from './types'
import { solarySchemaRegistry } from './solary'
import { heroSchema } from './hero'
import { countdownSchema } from './countdown'
import { ourStorySchema } from './ourStory'
import { eventDetailsSchema } from './eventDetails'
import { brideGroomSchema } from './brideGroom'
import { weddingPartySchema } from './weddingParty'
import { galleryMasonrySchema } from './galleryMasonry'
import { gallerySpringCoilSchema } from './gallerySpringCoil'
import { scheduleSchema } from './schedule'
import { rsvpSchema } from './rsvp'
import { weddingGiftSchema } from './weddingGift'
import { registrySchema } from './registry'
import { accommodationsSchema } from './accommodations'
import { faqSchema } from './faq'
import { guestbookSchema } from './guestbook'
import { footerSchema } from './footer'
import { quoteSchema } from './quote'

export const schemaRegistry: Record<string, SectionSchema> = {
  hero:              heroSchema,
  quote:             quoteSchema,
  countdown:         countdownSchema,
  ourStory:          ourStorySchema,
  eventDetails:      eventDetailsSchema,
  brideGroom:        brideGroomSchema,
  weddingParty:      weddingPartySchema,
  galleryMasonry:    galleryMasonrySchema,
  gallerySpringCoil: gallerySpringCoilSchema,
  schedule:          scheduleSchema,
  rsvp:              rsvpSchema,
  weddingGift:       weddingGiftSchema,
  registry:          registrySchema,
  accommodations:    accommodationsSchema,
  faq:               faqSchema,
  guestbook:         guestbookSchema,
  footer:            footerSchema,
}

export type { SectionSchema, FieldDef } from './types'

// Lovebirds: `registry` is folded into weddingGift (B); `guestbook` + `countdown`
// are removed (C). Exclude them from the lovebirds editor registry so the
// pickers never offer them.
const LOVEBIRDS_EXCLUDED = new Set(['registry', 'guestbook', 'countdown'])
const lovebirdsSchemaRegistry: Record<string, SectionSchema> = Object.fromEntries(
  Object.entries(schemaRegistry).filter(([type]) => !LOVEBIRDS_EXCLUDED.has(type)),
)

const registriesByTemplate: Record<string, Record<string, SectionSchema>> = {
  lovebirds: lovebirdsSchemaRegistry,
  solary: solarySchemaRegistry,
}

export function getSchemaRegistry(template: string): Record<string, SectionSchema> {
  return registriesByTemplate[template] ?? schemaRegistry
}
