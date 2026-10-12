'use client'

import React, { useEffect, useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { SectionHead } from '../components/SectionHead.jsx'
import styles from './Interactive.module.css'

const DEFAULTS = { eyebrow: 'Galeri', sectionTitle: 'Kenangan Kami', photos: [] }

/** Masonry gallery, each photo in a thin gold songket frame; tap to enlarge. */
export default function Gallery(props) {
  const { eyebrow, sectionTitle, sectionSubtitle, photos } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal(0.05)
  const [active, setActive] = useState(null)
  const list = (photos || [])
    .map((p) => (typeof p === 'string' ? { src: p, alt: '' } : p))
    .filter((p) => p?.src)

  useEffect(() => {
    if (active === null) return undefined
    const onKey = (e) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <section className="sk-section sk-section--alt sk-texture" aria-label="Galeri">
      <span className="sk-rebung" aria-hidden="true" />
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={eyebrow} title={sectionTitle} subtitle={sectionSubtitle} />
        <div className={styles.masonry}>
          {list.map((p, i) => (
            <button key={`${p.src}-${i}`} type="button" className={styles.tile} onClick={() => setActive(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt || `Foto ${i + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      {active !== null && list[active] && (
        <div className={styles.lightbox} role="dialog" aria-label="Foto diperbesar" onClick={() => setActive(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[active].src} alt={list[active].alt || ''} />
          <button type="button" className="sk-btn sk-btn--sm" onClick={() => setActive(null)}>Tutup</button>
        </div>
      )}
    </section>
  )
}
