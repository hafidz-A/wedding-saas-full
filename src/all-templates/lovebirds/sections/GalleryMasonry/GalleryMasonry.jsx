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

function distributeToColumns(photos) {
  const needed = 20
  let pool = [...photos]
  while (pool.length < needed) pool = [...pool, ...photos]

  const cols = [[], [], [], [], []]
  pool.forEach((photo, i) => cols[i % 5].push(photo))
  return cols
}

export default function GalleryMasonry({
  eyebrow = 'Our Moments',
  sectionTitle = 'Memories',
  sectionSubtitle = 'A small collection of our favorite memories together',
  photos = [],
}) {
  const cols = distributeToColumns(photos)

  return (
    <section className={styles.section}>
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
                  <img
                    src={photo.src}
                    alt={photo.alt || ''}
                    loading="lazy"
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
