'use client'

import styles from './GalleryMasonry.module.css'

/*
  Aspect-ratio pattern per column (4 entries, cycles).
  Each column starts offset so neighbouring columns have
  different height rhythms — creating natural masonry variety.
*/
const COL_RATIOS = [
  ['3/4', '4/3', '3/4', '1/1'],
  ['1/1', '3/4', '4/3', '3/4'],
  ['4/3', '3/4', '1/1', '3/4'],
  ['3/4', '1/1', '3/4', '4/3'],
  ['1/1', '4/3', '3/4', '1/1'],
]

const COL_SPEEDS = ['20s', '26s', '16s', '22s', '18s']
const COL_DIRS   = ['up', 'down', 'up', 'down', 'up']

/* The 5 belts animate on FIXED durations, so more photos = taller belts =
   faster scroll. Past ~30 the motion visibly races; the editor caps the
   field at the same number (galleryMasonry schema maxItems). */
export const MAX_PHOTOS = 30

export function distributeToColumns(photos) {
  // Guard the repeat-fill below: with an empty list the while-loop could
  // never reach `needed` and would spin forever, freezing the page.
  const source = photos.slice(0, MAX_PHOTOS)
  if (source.length === 0) return [[], [], [], [], []]

  const needed = 20
  let pool = [...source]
  while (pool.length < needed) pool = [...pool, ...source]

  const cols = [[], [], [], [], []]
  pool.forEach((photo, i) => cols[i % 5].push(photo))
  return cols
}

export default function GalleryMasonry({
  eyebrow = 'Our Moments',
  sectionTitle = 'Memories',
  sectionSubtitle = 'A small collection of our favorite memories together',
  photos = [],
  demoNote = '',
}) {
  const cols = distributeToColumns(photos)

  return (
    <section className={styles.section}>
      {/* Demo previews only — explains that a real invitation picks ONE gallery style. */}
      {demoNote && <p style={demoNoteStyle}>{demoNote}</p>}
      <div className={styles.header}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h2 className={styles.title}>{sectionTitle}</h2>
        {sectionSubtitle && <p className={styles.subtitle}>{sectionSubtitle}</p>}
      </div>

      <div className={styles.stage}>
        {cols.map((colPhotos, colIdx) => {
          /*
            Duplicate the column's photos: [a,b,c,d] → [a,b,c,d,a,b,c,d].
            beltUp animates translateY(0 → -50%), beltDown (-50% → 0).
            When CSS resets the loop, the clone is in the exact visual
            position of the original → seamless infinite scroll, no jump.
          */
          const doubled   = [...colPhotos, ...colPhotos]
          const beltClass = COL_DIRS[colIdx] === 'up' ? styles.beltUp : styles.beltDown

          return (
            <div
              key={colIdx}
              className={`${styles.belt} ${beltClass}`}
              style={{ '--spd': COL_SPEEDS[colIdx] }}
            >
              {doubled.map((photo, i) => (
                <div
                  key={i}
                  className={styles.cell}
                  style={{ aspectRatio: COL_RATIOS[colIdx][i % 4] }}
                >
                  {/* Broken URL → hide the broken-image icon/alt text so the
                      cell's soft placeholder background shows instead. */}
                  <img
                    /* keyed by src so swapping the photo in the editor
                       remounts the element and clears onError's display:none */
                    key={photo.src}
                    src={photo.src}
                    alt={photo.alt || ''}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const demoNoteStyle = {
  width: 'fit-content',
  maxWidth: 'min(86vw, 560px)',
  margin: '0 auto 28px',
  padding: '10px 22px',
  borderRadius: 999,
  background: 'var(--glass-bg, rgba(255,255,255,0.6))',
  border: '1px solid var(--glass-border, rgba(42,33,24,0.12))',
  color: 'var(--fg-muted, rgba(42,33,24,0.7))',
  fontFamily: 'var(--font-body, sans-serif)',
  fontSize: 13,
  lineHeight: 1.55,
  textAlign: 'center',
}
