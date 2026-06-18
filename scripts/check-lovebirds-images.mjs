// One-shot guard: every Lovebirds demo slot must resolve to a local
// file that exists and is non-empty. Mirrors check-demo-images.mjs but
// for the local Lovebirds override (src/all-templates/lovebirds/demoImages.js).
// Usage: node scripts/check-lovebirds-images.mjs
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { LOVEBIRDS_PHOTOS, lovebirdsImg } from '../src/all-templates/lovebirds/demoImages.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let failed = 0
for (const key of Object.keys(LOVEBIRDS_PHOTOS)) {
  const urlPath = lovebirdsImg(key, 800) // e.g. /templates/lovebirds/demo/x.jpg
  const filePath = path.join(ROOT, 'public', urlPath)
  try {
    const { size } = statSync(filePath)
    if (size <= 0) {
      failed++
      console.error(`x ${key} -> EMPTY  ${urlPath}`)
    } else {
      console.log(`ok ${key}  (${(size / 1024).toFixed(0)} KB)`)
    }
  } catch {
    failed++
    console.error(`x ${key} -> MISSING  ${filePath}`)
  }
}
if (failed > 0) {
  console.error(`\n${failed} missing/empty Lovebirds demo image(s).`)
  process.exit(1)
}
console.log(`\nAll ${Object.keys(LOVEBIRDS_PHOTOS).length} Lovebirds demo images healthy.`)
