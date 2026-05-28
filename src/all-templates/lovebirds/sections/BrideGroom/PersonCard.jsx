'use client'

import styles from './BrideGroom.module.css'

/**
 * Pure presentational card. All motion / 3D transforms are handled by the
 * wrapping components (RevealAnimationWrapper, FloatingLayer, ParallaxLayer)
 * so this file stays simple and easy to redesign visually.
 *
 * `variant` colours the accent ring + handle: 'bride' | 'groom' (or any
 * future role). Falls back to 'bride' styling for unknown variants.
 */
export default function PersonCard({ person, variant }) {
  const initial = (person?.name || '').trim().charAt(0).toUpperCase()
  const handleHref = person?.instagram
    ? `https://instagram.com/${person.instagram.replace(/^@/, '')}`
    : null

  return (
    <article className={`${styles.card} ${styles[`card-${variant}`]}`}>
      <div className={styles.photoOuter}>
        <span className={styles.photoRing} aria-hidden="true" />
        <div className={styles.photoFrame}>
          {person?.photo ? (
            <img
              src={person.photo}
              alt={person.name}
              loading="lazy"
              className={styles.photo}
            />
          ) : (
            <span className={styles.photoFallback} aria-hidden="true">
              {initial}
            </span>
          )}
        </div>
        <span className={styles.role}>{person?.role}</span>
      </div>

      <h3 className={styles.name}>{person?.name}</h3>
      {person?.parents && <p className={styles.parents}>{person.parents}</p>}
      {person?.bio && <p className={styles.bio}>{person.bio}</p>}

      {handleHref && (
        <a
          href={handleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.handle}
        >
          {person.instagram}
        </a>
      )}
    </article>
  )
}
