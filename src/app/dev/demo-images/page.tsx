import { notFound } from 'next/navigation'
import { DEMO_PHOTOS, demoImg } from '@/lib/demoImages'

/** Dev-only contact sheet to eyeball every demo image against its key. */
export default function DemoImagesPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const keys = Object.keys(DEMO_PHOTOS)
  return (
    <main style={{ padding: 24, background: '#111', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontFamily: 'monospace' }}>demo images — {keys.length} keys</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {keys.map((key) => (
          <figure key={key} style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demoImg(key, 400)} alt={key} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
            <figcaption style={{ color: '#9f9', fontFamily: 'monospace', fontSize: 12, padding: '4px 0' }}>{key}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
