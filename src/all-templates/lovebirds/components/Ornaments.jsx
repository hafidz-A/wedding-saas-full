'use client'

import styles from './Ornaments.module.css'

// SVG path sets — copied verbatim from style-guide-lovebirds.html lines 2310-2331.
const SHAPES = {
  birds: `<path class="wing-back" d="M28 33 C29 22, 26 12, 18 6 C15 4, 13 7, 15 13 C13 10, 9 14, 12 21 C10 18, 6 22, 9 29 C7 26, 3 30, 7 37 C5 34, 2 38, 6 42 C12 44, 22 41, 28 33 Z" />
              <path class="bird-body" d="M4 32 L4 38 L20 38 C26 42, 34 43, 40 40 C44 38, 48 35, 58 32 C52 30, 49 28, 46 26 C43 24, 40 25, 36 29 C32 32, 27 33, 22 33 L4 32 Z" />
              <path class="wing-front" d="M30 33 C31 22, 28 10, 20 4 C17 2, 15 5, 17 11 C15 8, 11 12, 14 19 C12 16, 8 20, 11 27 C9 24, 5 28, 9 35 C7 32, 4 36, 8 41 C14 43, 24 41, 30 33 Z" />`,
  butterflies: `<path class="wing-back" d="M30 32 C23 20, 15 13, 9 17 C6 20, 8 28, 15 32 C12 37, 9 46, 12 48 C14 49, 18 43, 22 39 C25 42, 27 41, 28 38 Z" />
              <path class="bird-body" d="M31 32 C33 30, 36 27, 37 27 C38 27, 39 28, 38 29 C37 31, 34 34, 32 34 C31 34, 30 33, 31 32 Z M37 27 C38 26, 39 25, 39 24 C39 23, 38 22, 37 22 C36 22, 35 23, 35 24 C35 25, 36 26, 37 27 Z M31 33 C29 35, 26 39, 22 43 C21 44, 20 44, 21 43 C23 39, 27 35, 30 32 Z M37 23 C41 19, 44 14, 45 13 C46 12, 45 11, 44 12 C41 15, 39 19, 37 23 Z M36 24 Q39 18, 41 12 Q42 11, 41 10 Q40 9, 39 10 Q40 11, 39 12 Q37 18, 35 23 Z M36 24 C39 18, 41 12, 42 11 C43 10, 42 9, 41 10 C39 12, 37 18, 36 24 Z" />
              <path class="wing-front" d="M32 32 C24 16, 15 8, 10 13 C7 16, 12 28, 22 32 C17 38, 12 48, 15 50 C18 52, 24 46, 29 36 C31 38, 32 36, 32 32 Z" />`,
  perched: `<path class="branch-twig" d="M10 44 L54 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="tail-feathers" d="M22 38 L14 48 C13 49 15 50 16 48 L25 40 Z" fill="currentColor" opacity="0.8" />
              <path class="feet" d="M32 38 L30 44 M36 38 L38 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="bird-body" d="M22 32 C22 25, 26 20, 32 20 C38 20, 42 25, 42 32 C42 38, 38 40, 32 40 C26 40, 22 38, 22 32 Z" fill="currentColor" />
              <circle class="bird-head" cx="37" cy="16" r="8" fill="currentColor" />
              <circle cx="39" cy="14" r="1.5" fill="#000" />
              <path class="beak" d="M45 14 L49 16 L45 18 Z" fill="#F5A623" />
              <path class="wing-front" d="M26 30 C26 26, 32 26, 35 32 C38 38, 32 38, 29 36 Z" fill="currentColor" opacity="0.9" />`,
}

const BG_BIRDS = [5, 6, 7, 8, 9]
const FG_BIRDS = [1, 2, 3]

export default function Ornaments({ ornamentType = 'birds', paletteKey } = {}) {
  const isPerched = ornamentType === 'perched'
  const inner = SHAPES[ornamentType] || SHAPES.birds

  return (
    <div className={styles.root} aria-hidden="true">
      {!isPerched && (
        <>
          <div className={`${styles.flyZoneBg} fly-zone-bg`}>
            {BG_BIRDS.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
          <div className={`${styles.flyZoneFg} fly-zone-fg`}>
            {FG_BIRDS.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
        </>
      )}
      <PerchedCanvas active={isPerched} paletteKey={paletteKey} />
    </div>
  )
}

// Stub for this task — the Canvas engine is implemented in the NEXT task.
function PerchedCanvas() {
  return null
}
