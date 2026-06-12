import { notFound } from 'next/navigation'
import { demoImg, DEMO_PHOTOS } from '@/lib/demoImages'
import StressClient from './StressClient'

/** Dev-only stress page: renders the lovebirds galleries at (or past) their
 *  photo caps so the caps can be eyeballed in a real browser.
 *  /dev/gallery-stress?coil=16&masonry=30 */
export default function GalleryStressPage({
  searchParams,
}: {
  searchParams: { coil?: string; masonry?: string }
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const keys = Object.keys(DEMO_PHOTOS)
  const photoAt = (i: number) => demoImg(keys[i % keys.length], 900)
  const nCoil = Math.max(1, Number(searchParams.coil) || 16)
  const nMasonry = Math.max(0, Number(searchParams.masonry) || 30)
  const coilPhotos = Array.from({ length: nCoil }, (_, i) => ({
    id: `c${i}`,
    src: photoAt(i),
    caption: `Foto ${i + 1}`,
  }))
  const masonryPhotos = Array.from({ length: nMasonry }, (_, i) => ({
    src: photoAt(i),
    alt: `Foto ${i + 1}`,
  }))
  return <StressClient coilPhotos={coilPhotos} masonryPhotos={masonryPhotos} />
}
