'use client'

import React from 'react'
import useReveal from '../hooks/useReveal.js'
import { NampanPerak, CoupleAesanGede } from '../components/ornaments.jsx'
import { SectionHead } from '../components/SectionHead.jsx'
import styles from './Content.module.css'

const DEFAULTS = {
  eyebrow: 'Mempelai',
  title: 'Dua Keluarga, Satu Ikatan',
  portraitStyle: 'siluet', // 'siluet' = Aesan Gede silhouette, 'foto' = uploaded photo
  people: [],
}

const BRIDE = /bride|wanita|perempuan|istri/i

/** Bride & groom, each framed in a nampan-perak medallion. */
export default function BrideGroom(props) {
  const { eyebrow, title, subtitle, people, portraitStyle } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal()
  const list = Array.isArray(people) ? people : []

  return (
    <section className="sk-section sk-section--alt sk-texture" aria-label="Mempelai">
      <span className="sk-rebung" aria-hidden="true" />
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className={styles.people}>
          {list.map((p, i) => {
            const isBride = BRIDE.test(String(p.role ?? '')) || (!p.role && i === 0)
            const usePhoto = portraitStyle === 'foto' && p.photo
            return (
              <React.Fragment key={`${p.name}-${i}`}>
                {i === 1 && <span className={styles.amp} aria-hidden="true">&amp;</span>}
                <article className={styles.person}>
                  <NampanPerak className={styles.medallion}>
                    {usePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt={p.name} className={styles.portrait} loading="lazy" />
                    ) : (
                      <span className={styles.silhouetteWrap}>
                        <CoupleAesanGede who={isBride ? 'bride' : 'groom'} className={styles.silhouette} />
                      </span>
                    )}
                  </NampanPerak>
                  {p.role && <p className={styles.role}>{p.role}</p>}
                  <h3 className={styles.personName}>{p.name}</h3>
                  {p.parents && <p className={styles.parents}>{p.parents}</p>}
                  {p.instagram && (
                    <a
                      className="sk-btn sk-btn--ghost sk-btn--sm"
                      href={`https://instagram.com/${String(p.instagram).replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p.instagram}
                    </a>
                  )}
                </article>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </section>
  )
}
