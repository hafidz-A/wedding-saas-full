'use client'

import { useState } from 'react'
import styles from './BrideGroom.module.css'
import ThreeDTilt from '../../components/ThreeDTilt.jsx'

/**
 * Double-sided 3D PersonCard wrapped in ThreeDTilt.
 * Combines GSAP entrance scroll spin with cursor mouse tilt interactions.
 * Displays a gold monogram invitation design on the back face during rotation.
 */
export default function PersonCard({ person, variant, monogram }) {
  const initial = (person?.name || '').trim().charAt(0).toUpperCase()
  // Couple monogram passed from BrideGroom (e.g. "A & R"); fall back to this
  // person's initial, then "&", so the back is never blank.
  const backMonogram = monogram || initial || '&'
  // If a provided photo URL fails to load, fall back to the initial tile
  // instead of showing the browser's broken-image icon.
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = !!person?.photo && !photoFailed
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
      {/* Front Face — full-bleed editorial photo with caption overlay */}
      <div className={styles.cardFront}>
        <div className={styles.photoFull}>
          {showPhoto ? (
            <img
              src={person.photo}
              alt={person.name}
              loading="lazy"
              className={styles.photo}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span className={styles.photoFallback} aria-hidden="true">
              {initial}
            </span>
          )}

          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.caption}>
            {person?.role && <span className={styles.role}>{person.role}</span>}
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
        </div>
      </div>

      {/* Back Face (Luxury Monogram Design) */}
      <div className={styles.cardBack} aria-hidden="true">
        <div className={styles.cardBackInner}>
          <div className={styles.monogramBorder}>
            <span className={styles.monogramText}>{backMonogram}</span>
            <span className={styles.monogramDivider} />
            <span className={styles.monogramDate}>Save The Date</span>
          </div>
        </div>
      </div>
    </ThreeDTilt>
  )
}
