// Regenerate the Lovebirds solo bride/groom portraits by cropping them out of
// the anchor-couple frames, so the portraits stay the same two faces as the
// rest of the template. Run after (re)downloading the source frames.
//
//   npm i sharp        # one-off; sharp is not a project dependency
//   node scripts/crop-lovebirds-portraits.mjs
//
// Both solos are cropped from the hero (coupleGate.jpg, Pexels 32167185), a
// bright cheek-to-cheek frame: the bride is on the LEFT, the groom on the RIGHT,
// both facing camera — so the Bride & Groom section shows the same faces as the
// gate, in the same clean neutral tone.
import sharp from 'sharp'
import path from 'node:path'

const DEMO = path.resolve('public/templates/lovebirds/demo')

// Each crop: source file + [leftFrac, topFrac, widthFrac]; height derived 3:4.
const crops = {
  bridePortrait: { src: 'coupleGate.jpg', box: [0.17, 0.07, 0.38] },
  groomPortrait: { src: 'coupleGate.jpg', box: [0.54, 0.07, 0.40] },
}

for (const [name, { src, box: [lf, tf, wf] }] of Object.entries(crops)) {
  const SRC = path.join(DEMO, src)
  const meta = await sharp(SRC).metadata()
  const left = Math.round(lf * meta.width)
  const top = Math.round(tf * meta.height)
  let width = Math.round(wf * meta.width)
  let height = Math.round((width * 4) / 3)
  width = Math.min(width, meta.width - left)
  height = Math.min(height, meta.height - top)
  await sharp(SRC)
    .extract({ left, top, width, height })
    .resize(900, 1200, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 86 })
    .toFile(path.join(DEMO, `${name}.jpg`))
  console.log(`${name}.jpg  <- ${src}  extract L${left} T${top} ${width}x${height}`)
}
