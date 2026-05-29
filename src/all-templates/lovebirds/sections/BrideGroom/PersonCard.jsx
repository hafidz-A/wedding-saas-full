'use client'

import styles from './BrideGroom.module.css'
import ThreeDTilt from '../../components/ThreeDTilt.jsx'

/**
 * Double-sided 3D PersonCard wrapped in ThreeDTilt.
 * Combines GSAP entrance scroll spin with cursor mouse tilt interactions.
 * Displays a gold monogram invitation design on the back face during rotation.
 */
export default function PersonCard({ person, variant }) {
  const initial = (person?.name || '').trim().charAt(0).toUpperCase()
  const handleHref = person?.instagram
    ? `https://instagram.com/${person.instagram.replace(/^@/, '')}`
    : null

  return (
    <ThreeDTilt
      className={`${styles.card} ${styles[`card-${variant}`]}`}
      max={12}
      perspective={1200}
      scale={1.04}
    >
      {/* Front Face */}
      <div className={styles.cardFront}>
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
      </div>

      {/* Back Face (Luxury Monogram Design) */}
      <div className={styles.cardBack} aria-hidden="true">
        <div className={styles.cardBackInner}>
          <div className={styles.monogramBorder}>
            <span className={styles.monogramText}>R & A</span>
            <span className={styles.monogramDivider} />
            <span className={styles.monogramDate}>Save The Date</span>
          </div>
        </div>
      </div>
    </ThreeDTilt>
  )
}
