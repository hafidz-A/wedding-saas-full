'use client'

import React from 'react'
import useReveal from '../hooks/useReveal.js'
import { SectionHead } from '../components/SectionHead.jsx'
import styles from './Content.module.css'

const DEFAULTS = {
  eyebrow: 'Perjalanan Kami',
  title: 'Menuju Hari Bahagia',
  showImages: true,
  stories: [],
}

/** Timeline along a songket spine — by default the adat steps toward munggah. */
export default function OurStory(props) {
  const { eyebrow, title, subtitle, showImages } = { ...DEFAULTS, ...props }
  // Lovebirds accepts `stories` or legacy `cards`; keep the same contract.
  const items = (props.stories ?? props.cards ?? []).filter(Boolean)
  return (
    <section className="sk-section sk-texture" aria-label="Perjalanan kami">
      <div className="sk-inner">
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <ol className={styles.timeline}>
          {items.map((s, i) => (
            <StoryItem key={s.id ?? i} story={s} showImage={showImages} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function StoryItem({ story, showImage }) {
  const { ref, visible } = useReveal(0.2)
  return (
    <li ref={ref} className={`${styles.step} sk-reveal ${visible ? 'is-visible' : ''}`}>
      <span className={styles.node} aria-hidden="true" />
      <div className={`sk-card ${styles.stepCard}`}>
        {(story.year || story.date) && (
          <p className={styles.stepDate}>{[story.date, story.year].filter(Boolean)[0]}</p>
        )}
        <h3 className={styles.stepTitle}>{story.title}</h3>
        {story.description && <p className={styles.stepText}>{story.description}</p>}
        {showImage && story.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.image} alt={story.title || ''} className={styles.stepImage} loading="lazy" />
        )}
      </div>
    </li>
  )
}
