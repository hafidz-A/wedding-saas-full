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
import { playlistSchema } from './playlist'
import { footerSchema } from './footer'

export const schemaRegistry: Record<string, SectionSchema> = {
  hero:              heroSchema,
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
  playlist:          playlistSchema,
  footer:            footerSchema,
}

export type { SectionSchema, FieldDef } from './types'

const registriesByTemplate: Record<string, Record<string, SectionSchema>> = {
  lovebirds: schemaRegistry,
  solary: solarySchemaRegistry,
}

export function getSchemaRegistry(template: string): Record<string, SectionSchema> {
  return registriesByTemplate[template] ?? schemaRegistry
}
