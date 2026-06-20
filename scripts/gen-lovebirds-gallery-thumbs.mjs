/* ============================================================
   gen-lovebirds-gallery-thumbs.mjs

   Generates lightweight card-sized thumbnails (<key>-sm.jpg) for
   the Lovebirds demo gallery photos. The Spring Coil gallery renders
   each photo inside a ~150px card but the originals are 1000-1800px
   tall — decoding 16+ of those full-resolution bitmaps into tiny
   cards is what made that section feel heavy on phones.

   The coil cards now load these -sm thumbs; the lightbox (click to
   zoom) still loads the full original, so zoom quality is unchanged.
   The full originals are also left untouched so Hero / Our Story /
   Bride & Groom — which reuse the same files at large sizes — keep
   their resolution.

   Run:  node scripts/gen-lovebirds-gallery-thumbs.mjs
   Idempotent: re-running overwrites the -sm files in place.
   ============================================================ */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const DEMO_DIR = 'public/templates/lovebirds/demo'
const THUMB_WIDTH = 400
const THUMB_QUALITY = 72

async function main() {
  const files = await readdir(DEMO_DIR)
  const sources = files.filter(
    (f) => f.endsWith('.jpg') && !f.endsWith('-sm.jpg'),
  )

  let totalBefore = 0
  let totalAfter = 0

  for (const file of sources) {
    const src = join(DEMO_DIR, file)
    const out = join(DEMO_DIR, file.replace(/\.jpg$/, '-sm.jpg'))

    const before = (await stat(src)).size
    await sharp(src)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
      .toFile(out)
    const after = (await stat(out)).size

    totalBefore += before
    totalAfter += after
    console.log(
      `${file.padEnd(28)} ${(before / 1024).toFixed(0).padStart(5)}KB -> ${(after / 1024).toFixed(0).padStart(4)}KB  (${out.split(/[\\/]/).pop()})`,
    )
  }

  console.log(
    `\n${sources.length} thumbs. Full set ${(totalBefore / 1024).toFixed(0)}KB -> thumbs ${(totalAfter / 1024).toFixed(0)}KB`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
