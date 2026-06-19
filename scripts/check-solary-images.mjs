// One-shot guard for the Solary demo photo source.
// Solary reuses the local Lovebirds image set via solaryImg
// (src/all-templates/solary/demoImages.js):
//   - SOLARY_LOCAL keys must resolve to a local file that exists + is non-empty.
//   - Fallback keys (bridal-party avatars, gift wishlist) must still resolve in
//     the shared Unsplash registry so solaryImg never throws.
// Usage: node scripts/check-solary-images.mjs
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SOLARY_LOCAL, solaryImg } from '../src/all-templates/solary/demoImages.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Keys Solary renders that intentionally fall back to the shared registry
// (the one-couple Lovebirds set can't supply these).
const FALLBACK_KEYS = [
  'partyMaidOfHonor', 'partyBridesmaid2', 'partyBridesmaid3',
  'partyBestMan', 'partyGroomsman2', 'partyGroomsman3',
  'wishlistCookware', 'wishlistHoneymoon',
]

let failed = 0

for (const key of Object.keys(SOLARY_LOCAL)) {
  const urlPath = solaryImg(key, 800) // e.g. /templates/lovebirds/demo/x.jpg
  const filePath = path.join(ROOT, 'public', urlPath)
  try {
    const { size } = statSync(filePath)
    if (size <= 0) {
      failed++
      console.error(`x ${key} -> EMPTY  ${urlPath}`)
    } else {
      console.log(`ok ${key} -> ${SOLARY_LOCAL[key]}  (${(size / 1024).toFixed(0)} KB)`)
    }
  } catch {
    failed++
    console.error(`x ${key} -> MISSING  ${filePath}`)
  }
}

for (const key of FALLBACK_KEYS) {
  try {
    const url = solaryImg(key, 400)
    if (!/^https?:\/\//.test(url)) {
      failed++
      console.error(`x ${key} -> expected Unsplash fallback URL, got ${url}`)
    } else {
      console.log(`ok ${key} -> Unsplash fallback`)
    }
  } catch (e) {
    failed++
    console.error(`x ${key} -> THREW  ${e.message}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} Solary demo image problem(s).`)
  process.exit(1)
}
console.log(`\nAll ${Object.keys(SOLARY_LOCAL).length} local + ${FALLBACK_KEYS.length} fallback Solary demo images healthy.`)
