'use client'

import React from 'react'
import { Melati } from './ornaments.jsx'
import styles from './AmbientOrnaments.module.css'

/* Fixed, deterministic positions (no Math.random) so SSR and hydration agree.
   Kept sparse on purpose: the ornament is a garnish, not a particle system. */
const PETALS = [
  { left: '4%', delay: 0, dur: 14, size: 16 },
  { left: '12%', delay: 6, dur: 17, size: 12 },
  { left: '88%', delay: 2, dur: 15, size: 18 },
  { left: '95%', delay: 9, dur: 19, size: 13 },
  { left: '30%', delay: 12, dur: 21, size: 11 },
  { left: '70%', delay: 4, dur: 18, size: 14 },
  { left: '52%', delay: 15, dur: 22, size: 10 },
]

const SPOTS = [
  ['8%', '18%', 0], ['22%', '64%', 1.4], ['80%', '26%', 2.2], ['91%', '72%', 0.6],
  ['46%', '12%', 3.1], ['64%', '86%', 1.9], ['14%', '88%', 2.7], ['72%', '50%', 3.6],
]

export default function AmbientOrnaments({ type }) {
  if (!type || type === 'none') return null
  return (
    <div className={styles.layer} aria-hidden="true">
      {type === 'melati' &&
        PETALS.map((p, i) => (
          <span
            key={i}
            className={styles.petal}
            style={{ left: p.left, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
          >
            <Melati />
          </span>
        ))}
      {type === 'kilauEmas' &&
        SPOTS.map(([left, top, delay], i) => (
          <span
            key={i}
            className={styles.glint}
            style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${3.2 + (i % 3)}s` }}
          />
        ))}
      {type === 'kunang' &&
        SPOTS.map(([left, top, delay], i) => (
          <span
            key={i}
            className={styles.firefly}
            style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${6 + (i % 4)}s` }}
          />
        ))}
    </div>
  )
}
