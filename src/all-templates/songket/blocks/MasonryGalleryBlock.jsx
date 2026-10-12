'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

/**
 * Simple column-count masonry gallery. Items can be:
 *   ['url', 'url']  or  [{ src, alt, caption }]
 */
export default function MasonryGalleryBlock({ items = [], reveal = true }) {
  const normalized = items.map((it, i) =>
    typeof it === 'string' ? { id: i, src: it } : { id: it.id ?? i, ...it },
  )

  const content = (
    <div className={styles.masonry}>
      {normalized.map((it) => (
        <figure key={it.id} className={styles.masonryItem}>
          <img src={it.src} alt={it.alt || ''} loading="lazy" />
        </figure>
      ))}
    </div>
  )

  return reveal ? <AnimatedReveal direction="up">{content}</AnimatedReveal> : content
}
