'use client'

import styles from './SectionBackground.module.css'

import { UkiranCornerArt } from './adat/AdatPetals.jsx'

/**
 * Carved ukiran corners for a section (Lovebirds' curve-and-dot corners in
 * adat form). Renders in the parent's top-left and bottom-right corners; the
 * parent must be `position: relative`. `tone` is accepted for call-site
 * compatibility — the corners always take the palette gold.
 */
// eslint-disable-next-line no-unused-vars
export default function SectionBackground({ tone = 'mixed' }) {
  return (
    <div className={styles.bg} aria-hidden="true">
      <UkiranCornerArt className={styles.topLeft} />
      <UkiranCornerArt className={styles.bottomRight} style={{ transform: 'rotate(180deg)' }} />
    </div>
  )
}
