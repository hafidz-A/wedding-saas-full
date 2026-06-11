/* ============================================================
   demoImages.js — single source for every demo/placeholder photo.
   Keys are context slots; values are Unsplash photo IDs.
   Consumed by: lovebirds defaultConfig, solary pageConfig, editor
   schemas, marketing components, and fillEmptyImages (render-time
   fallback for purchased invitations).
   Verify visually via /dev/demo-images (dev only) and
   `node scripts/check-demo-images.mjs` after any change.
   ============================================================ */

export const DEMO_PHOTOS = {
  // — couple & portraits —
  coupleGate:      '1519741497674-611481863552', // bride & groom, classic formal
  coupleClassic:   '1529636798458-92182e662485', // wedding-day couple
  coupleCasual:    '1516589178581-6cd7833ae3b2', // couple casual outdoors
  coupleSunset:    '1474552226712-ac0f0961a954', // couple silhouette at sunset
  bridePortrait:   '1525186402429-b4ff38bedec6', // bride solo portrait
  groomPortrait:   '1507003211169-0a1dd7228f2d', // groom/man solo portrait

  // — story moments (lovebirds OurStory + solary storyPlanet) —
  storyFirstMeet:  '1522098635833-216c03d81fbe', // couple by the sea
  storyFirstDate:  '1475738972911-5b44ce984c42', // bonfire / evening date
  storyHoliday:    '1543589077-47d81606c1bf',    // festive holiday together
  storyProposal:   '1532712938310-34cb3982ef74', // proposal moment
  storyWedding:    '1465495976277-4387d4b0b4c6', // ceremony / arch

  // — gallery moments —
  galleryCoffee:        '1495474472287-4d71bcdd2085', // coffee
  galleryRoadTrip:      '1469854523086-cc02fe5d8800', // road trip / car
  gallerySunsetWalk:    '1494774157365-9e04c6720e47', // sunset couple silhouette
  galleryCityLights:    '1519501025264-65ba15a82390', // city night
  galleryCooking:       '1556911220-bff31c812dba',    // cooking at home
  galleryFamilyDinner:  '1414235077428-338989a2e8c0', // dinner table
  galleryBeach:         '1507525428034-b723cf961d3e', // beach
  galleryHiking:        '1501555088652-021faa106b9b', // hiking couple
  galleryMovieNight:    '1489599849927-2ee91cede3ba', // cinema
  galleryBirthday:      '1464349095431-e9a21285b5f3', // birthday cake candles
  galleryAnniversary:   '1518621736915-f3b1c41bfd00', // intimate dinner / toast
  gallerySunrise:       '1470252649378-9c29740c9fa8', // sunrise sky
  galleryCelebration:   '1492684223066-81342ee5ff30', // sparklers celebration
  galleryVenue:         '1519167758481-83f550bb49b3', // garden venue
  galleryDressFitting:  '1583391733956-3750e0ff4e8b', // bridal dress
  galleryCakeTasting:   '1535141192574-5d4897c12636', // wedding cake
  galleryPreWedShoot:   '1494955870715-979ca4f13bf0', // pre-wedding shoot
  galleryBrunch:        '1529543544282-ea669407fca3', // brunch spread
  gallerySaveTheDate:   '1607190074257-dd4b7af0309f', // stationery / invites
  galleryRings:         '1605100804763-247f67b3557e', // wedding rings
  galleryFirstDance:    '1520342868574-5fa3804e551c', // first dance

  // — wedding party / team —
  partyMaidOfHonor:  '1494790108377-be9c29b29330', // woman portrait 1
  partyBridesmaid2:  '1438761681033-6461ffad8d80', // woman portrait 2
  partyBridesmaid3:  '1544005313-94ddf0286df2',    // woman portrait 3
  partyBestMan:      '1500648767791-00dcc994a43e', // man portrait 1
  partyGroomsman2:   '1506794778202-cad84cf45f1d', // man portrait 2
  partyGroomsman3:   '1472099645785-5658abf4ff4e', // man portrait 3

  // — wishlist / gifts —
  wishlistCookware:  '1556909114-f6e7ad7d3136',    // kitchen / cookware
  wishlistHoneymoon: '1507525428034-b723cf961d3e', // beach travel (shared w/ galleryBeach — OK)
}

/** Build a CDN URL for a registry key at the given pixel width. */
export function demoImg(key, width) {
  const id = DEMO_PHOTOS[key]
  if (!id) throw new Error(`unknown demo image key: ${key}`)
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`
}
