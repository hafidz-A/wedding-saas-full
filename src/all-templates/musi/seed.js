/* ============================================================
   musi/seed.js — a new couple's starting config.

   Called by onboarding and by the admin "create invitation for client" flow
   (via src/lib/onboarding/seed-config.ts). Deep-clones the demo config and
   swaps in the couple's own names, date and venue, and clears the demo
   couple's personal details (parents, story, accounts, photos) so a guest can
   never see a stranger's data on a real invitation. Plain data, server-safe.
   ============================================================ */
import { defaultConfig } from './defaultConfig.js'

const firstName = (s) => String(s || '').trim().split(/\s+/)[0] || ''

/**
 * @param {{ brideName: string, groomName: string, weddingDate: string, venue: string }} input
 */
export function buildMusiSeedConfig(input) {
  const config = JSON.parse(JSON.stringify(defaultConfig))
  const bride = firstName(input.brideName)
  const groom = firstName(input.groomName)
  // datetime inputs give "YYYY-MM-DDTHH:mm[:ss]"; keep it zone-less like the
  // editor's datetime field (the section's timezone field supplies WIB/WITA/WIT).
  const date = String(input.weddingDate || '').slice(0, 16)

  config.couple = { name1: bride, name2: groom }

  for (const section of config.sections) {
    const p = section.props || {}
    switch (section.type) {
      case 'musiCouple':
        p.groomNickname = groom
        p.groomFullName = String(input.groomName || '').trim()
        p.groomParents = ''
        p.groomPhoto = ''
        p.brideNickname = bride
        p.brideFullName = String(input.brideName || '').trim()
        p.brideParents = ''
        p.bridePhoto = ''
        break
      case 'musiStory':
        p.moments = [{ id: 'm1', year: '', title: 'Awal Cerita', body: 'Tulis kisah kalian di sini.' }]
        break
      case 'musiSaveDate':
        if (date) p.date = date
        break
      case 'musiEvents':
        p.venue = String(input.venue || '').trim()
        p.address = ''
        p.mapUrl = ''
        break
      case 'musiGallery':
        p.photos = []
        break
      case 'guestbook':
        p.initialNotes = []
        break
      case 'musiGift':
        p.accounts = []
        p.giftAddress = ''
        break
      case 'musiClosing':
        p.couplePhoto = ''
        break
      default:
        break
    }
    section.props = p
    section.enabled = true
  }

  return config
}
