'use client'

import GallerySpringCoil from '@/all-templates/lovebirds/sections/GallerySpringCoil/GallerySpringCoil.jsx'
import GalleryMasonry from '@/all-templates/lovebirds/sections/GalleryMasonry/GalleryMasonry.jsx'

interface Photo { id?: string; src: string; caption?: string; alt?: string }

export default function StressClient({
  coilPhotos,
  masonryPhotos,
}: {
  coilPhotos: Photo[]
  masonryPhotos: Photo[]
}) {
  return (
    <main>
      <div style={{ padding: 12, background: '#111', color: '#9f9', fontFamily: 'monospace', fontSize: 13 }}>
        gallery-stress · coil={coilPhotos.length} · masonry={masonryPhotos.length} — ubah via ?coil=N&masonry=N
      </div>
      <GallerySpringCoil
        photos={coilPhotos}
        sectionTitle={`Spring Coil ×${coilPhotos.length}`}
        sectionSubtitle="stress test"
      />
      <GalleryMasonry
        photos={masonryPhotos}
        sectionTitle={`Masonry ×${masonryPhotos.length}`}
        eyebrow="stress test"
        sectionSubtitle=""
      />
    </main>
  )
}
