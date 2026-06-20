/* ============================================================
   apply-lovebirds-illustrations.mjs

   One-shot: apply the Phase-4 APPROVED Lovebirds illustrations into the
   demo slots. Converts each generated PNG -> public/templates/lovebirds/
   demo/<key>.jpg at a slot-appropriate width, overwriting the previous
   stock photos. demoImages.js keeps pointing at the same .jpg names, so
   no wiring changes are needed.

   Widths/quality are tuned LIGHT (web delivery) so the invitation opens fast
   on mobile — each slot is sized to roughly 2x its largest on-screen size,
   re-encoded as progressive mozjpeg.

   Run:  node scripts/apply-lovebirds-illustrations.mjs
   Then: node scripts/gen-lovebirds-gallery-thumbs.mjs   (regen -sm thumbs)
         node scripts/check-lovebirds-images.mjs         (verify)
   ============================================================ */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { statSync } from 'node:fs'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = 'C:\\Users\\arifi\\Downloads\\lovebirds photo'
const DEST = path.join(ROOT, 'public', 'templates', 'lovebirds', 'demo')

const QUALITY = 78

// generated PNG filename -> [demo slot key, target width]
// hero gets the most pixels (full-screen); story/portraits mid; gallery tiles
// (shown small in masonry / coil) get the least.
const MAP = {
  'Gemini_Generated_Image_r4ieapr4ieapr4ie.png': ['coupleGate', 1280],
  'Gemini_Generated_Image_rs5udkrs5udkrs5u.png': ['bridePortrait', 880],
  'Gemini_Generated_Image_231rpf231rpf231r.png': ['groomPortrait', 880],
  'Gemini_Generated_Image_37wevh37wevh37we.png': ['coupleClassic', 820],
  'Gemini_Generated_Image_i0hhpqi0hhpqi0hh.png': ['coupleCasual', 820],
  'Gemini_Generated_Image_6sj7c56sj7c56sj7.png': ['storyFirstMeet', 1000],
  'Gemini_Generated_Image_2st8kx2st8kx2st8.png': ['storyFirstDate', 1000],
  'Gemini_Generated_Image_abnggzabnggzabng.png': ['storyHoliday', 1000],
  'Gemini_Generated_Image_25yjye25yjye25yj.png': ['storyProposal', 1000],
  'Gemini_Generated_Image_y8ykaly8ykaly8yk.png': ['storyWedding', 1000],
  'Gemini_Generated_Image_u9m79xu9m79xu9m7.png': ['gallerySunsetWalk', 1000],
  'Gemini_Generated_Image_vvkgrivvkgrivvkg.png': ['galleryFirstDance', 760],
  'Gemini_Generated_Image_ke6617ke6617ke66.png': ['galleryBeach', 1000],
  'Gemini_Generated_Image_duvv8gduvv8gduvv.png': ['galleryRoadTrip', 1000],
  'Gemini_Generated_Image_v9ilthv9ilthv9il.png': ['galleryCityLights', 1000],
  'Gemini_Generated_Image_mult8qmult8qmult.png': ['galleryFamilyDinner', 760],
  'Gemini_Generated_Image_cbxelycbxelycbxe.png': ['galleryBirthday', 760],
  'Gemini_Generated_Image_bj5nv6bj5nv6bj5n.png': ['galleryCooking', 760],
  'Gemini_Generated_Image_ukitexukitexukit.png': ['galleryCoffee', 760],
  'Gemini_Generated_Image_27cysm27cysm27cy.png': ['gallerySunrise', 1000],
  'Gemini_Generated_Image_bpasqlbpasqlbpas.png': ['galleryRings', 760],
}

let done = 0
let totalKb = 0
const total = Object.keys(MAP).length
for (const [file, [key, width]] of Object.entries(MAP)) {
  const src = path.join(SRC, file)
  const out = path.join(DEST, `${key}.jpg`)
  await sharp(src)
    .flatten({ background: '#FDF6EC' })
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toFile(out)
  const kb = statSync(out).size / 1024
  totalKb += kb
  console.log(`ok ${key.padEnd(20)} ${String(width).padStart(4)}px  ${kb.toFixed(0).padStart(4)} KB`)
  done++
}
console.log(`\nApplied ${done}/${total} illustrations — full set ${(totalKb / 1024).toFixed(2)} MB`)
