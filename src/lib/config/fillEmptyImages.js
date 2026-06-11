/* ============================================================
   fillEmptyImages — render-time fallback so a published
   invitation NEVER shows an empty image slot. Walks
   config.sections[*].props and fills blank image-bearing fields
   with contextual photos from the demo registry. Pure: returns
   a new config, never mutates, never persisted to the DB.
   Wired in app/[template]/[slug]/page.tsx (public render +
   editor preview iframe + demo-* slugs, both templates).
   ============================================================ */
import { demoImg } from '../demoImages.js'

const blank = (v) => typeof v !== 'string' || v.trim() === ''

const STORY_POOL = ['storyFirstMeet', 'storyFirstDate', 'storyHoliday', 'storyProposal', 'storyWedding']
const GALLERY_POOL = [
  'galleryCoffee', 'galleryRoadTrip', 'gallerySunsetWalk', 'galleryCityLights',
  'galleryCooking', 'galleryFamilyDinner', 'galleryBeach', 'galleryHiking',
  'galleryCelebration', 'galleryAnniversary', 'galleryFirstDance', 'storyWedding',
]
const FEMALE_POOL = ['partyMaidOfHonor', 'partyBridesmaid2', 'partyBridesmaid3']
const MALE_POOL = ['partyBestMan', 'partyGroomsman2', 'partyGroomsman3']
const PORTRAIT_POOL = ['coupleClassic', 'coupleCasual', 'coupleSunset']
const WISHLIST_POOL = ['wishlistCookware', 'wishlistHoneymoon']

const FEMALE_ROLE = /bride|maid|wanita|perempuan|ibu/i
const MALE_ROLE = /groom|best\s*man|pria|laki|bapak/i

// Field names treated as a single image URL.
const SINGLE_IMAGE_FIELDS = new Set(['image', 'photo', 'avatar', 'src', 'portrait', 'portrait2', 'gateImage'])
// Field names treated as an array of image URL strings (or {src} objects).
const IMAGE_ARRAY_FIELDS = new Set(['blastPhotos', 'gatePhotos', 'photos', 'images'])

/**
 * One counter per pool per section, so consecutive empty slots cycle
 * through different photos instead of repeating the first one.
 */
function makePicker() {
  const counters = new Map()
  return (pool, width) => {
    const poolKey = pool.join(',')
    const n = counters.get(poolKey) ?? 0
    counters.set(poolKey, n + 1)
    return demoImg(pool[n % pool.length], width)
  }
}

function poolFor(fieldName, holder, sectionType) {
  if (fieldName === 'gateImage') return { pool: ['coupleGate'], width: 2000 }
  if (fieldName === 'portrait') return { pool: ['coupleClassic'], width: 1000 }
  if (fieldName === 'portrait2') return { pool: ['coupleCasual'], width: 1000 }
  if (fieldName === 'avatar' || fieldName === 'photo') {
    const role = String(holder?.role ?? '')
    if (FEMALE_ROLE.test(role)) return { pool: FEMALE_POOL, width: 800 }
    if (MALE_ROLE.test(role)) return { pool: MALE_POOL, width: 800 }
    return { pool: PORTRAIT_POOL, width: 800 }
  }
  if (fieldName === 'image') {
    // wishlist items carry a `url` sibling; story cards carry title/desc
    if (holder && 'url' in holder) return { pool: WISHLIST_POOL, width: 600 }
    if (sectionType === 'ourStory' || sectionType === 'storyPlanet') return { pool: STORY_POOL, width: 1400 }
    return { pool: GALLERY_POOL, width: 900 }
  }
  // 'src' singles and image-array entries
  if (sectionType === 'ourStory' || sectionType === 'storyPlanet') return { pool: STORY_POOL, width: 900 }
  return { pool: GALLERY_POOL, width: 900 }
}

function walk(node, sectionType, pick, holder) {
  if (Array.isArray(node)) return node.map((item) => walk(item, sectionType, pick, holder))
  if (node === null || typeof node !== 'object') return node

  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (SINGLE_IMAGE_FIELDS.has(key) && blank(value)) {
      const { pool, width } = poolFor(key, node, sectionType)
      out[key] = pick(pool, width)
    } else if (IMAGE_ARRAY_FIELDS.has(key) && Array.isArray(value)) {
      out[key] = value.map((entry) => {
        if (typeof entry === 'string') {
          if (!blank(entry)) return entry
          const { pool, width } = poolFor(key, node, sectionType)
          return pick(pool, width)
        }
        return walk(entry, sectionType, pick, node)
      })
    } else if (value && typeof value === 'object') {
      out[key] = walk(value, sectionType, pick, node)
    } else {
      out[key] = value
    }
  }
  return out
}

export function fillEmptyImages(config) {
  if (!config || !Array.isArray(config.sections)) return config
  const sections = config.sections.map((s) => {
    if (!s || !s.props) return s
    const pick = makePicker() // fresh cycle per section
    return { ...s, props: walk(s.props, s.type, pick, null) }
  })
  return { ...config, sections }
}

export default fillEmptyImages
