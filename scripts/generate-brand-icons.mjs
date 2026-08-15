// scripts/generate-brand-icons.mjs
// One-shot: derive all brand icon assets from the master FinCards logo photo.
// Usage: node scripts/generate-brand-icons.mjs [path-to-master.png]
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'

const SRC = process.argv[2] ?? 'C:/Users/arifi/Downloads/Gemini_Generated_Image_huk37hhuk37hhuk3.png'
mkdirSync('public/images/brand', { recursive: true })

// Kept OUTSIDE public/ on purpose: this is a ~5.7 MB design master, and
// anything under public/ is publicly fetchable over HTTP and billed as Vercel
// egress. Only the derived, right-sized files below belong in the served tree.
const MASTER = 'assets/brand/fincards-logo.png'
copyFileSync(SRC, MASTER)

await sharp(MASTER).resize({ width: 480 }).png().toFile('public/images/brand/fincards-logo-email.png')

// Square icon: tight center crop around the diagonal script lettering.
// Master is 2048×2048; the lettering sits roughly in the middle band.
const crop = sharp(MASTER).extract({ left: 324, top: 324, width: 1400, height: 1400 })
await crop.clone().resize(512, 512).png().toFile('public/images/brand/fincards-icon-512.png')
await crop.clone().resize(512, 512).png().toFile('src/app/icon.png')
await crop.clone().resize(180, 180).png().toFile('src/app/apple-icon.png')

const sizes = await Promise.all([16, 32, 48].map((s) => crop.clone().resize(s, s).png().toBuffer()))
writeFileSync('src/app/favicon.ico', await pngToIco(sizes))
console.log('brand icons written')
