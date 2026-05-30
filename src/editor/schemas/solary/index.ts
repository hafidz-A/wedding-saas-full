import type { SectionSchema } from '../types'
import { openingGateSchema } from './openingGate'
import { welcomePlanetSchema } from './welcomePlanet'
import { storyPlanetSchema } from './storyPlanet'
import { saturnRingSchema } from './saturnRing'
import { countdownPlanetSchema } from './countdownPlanet'
import { detailsPlanetSchema } from './detailsPlanet'
import { rsvpPlanetSchema } from './rsvpPlanet'
import { teamPlanetSchema } from './teamPlanet'
import { giftPlanetSchema } from './giftPlanet'
import { footerPlanetSchema } from './footerPlanet'
import { quotePlanetSchema } from './quotePlanet'
import { schedulePlanetSchema } from './schedulePlanet'
import { liveStreamPlanetSchema } from './liveStreamPlanet'
import { faqPlanetSchema } from './faqPlanet'

export const solarySchemaRegistry: Record<string, SectionSchema> = {
  openingGate:      openingGateSchema,
  welcomePlanet:    welcomePlanetSchema,
  storyPlanet:      storyPlanetSchema,
  saturnRing:       saturnRingSchema,
  countdownPlanet:  countdownPlanetSchema,
  detailsPlanet:    detailsPlanetSchema,
  rsvpPlanet:       rsvpPlanetSchema,
  teamPlanet:       teamPlanetSchema,
  giftPlanet:       giftPlanetSchema,
  footerPlanet:     footerPlanetSchema,
  quotePlanet:      quotePlanetSchema,
  schedulePlanet:   schedulePlanetSchema,
  liveStreamPlanet: liveStreamPlanetSchema,
  faqPlanet:        faqPlanetSchema,
}
