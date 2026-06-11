// One-shot guard: every registry photo must respond 200 from Unsplash.
// Usage: node scripts/check-demo-images.mjs
import { DEMO_PHOTOS, demoImg } from '../src/lib/demoImages.js'

let failed = 0
for (const key of Object.keys(DEMO_PHOTOS)) {
  const url = demoImg(key, 100)
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    failed++
    console.error(`x ${key} -> HTTP ${res.status}  ${url}`)
  } else {
    console.log(`ok ${key}`)
  }
}
if (failed > 0) {
  console.error(`\n${failed} dead photo ID(s). Replace them in src/lib/demoImages.js.`)
  process.exit(1)
}
console.log('\nAll demo images healthy.')
