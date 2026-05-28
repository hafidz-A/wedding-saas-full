'use client'

import StoryImageReveal from './StoryImageReveal.jsx'
import StoryTextReveal from './StoryTextReveal.jsx'
import styles from './OurStory.module.css'

/**
 * Mobile fallback for a single story — pinned scroll is too heavy on
 * touch devices, so each card simply reveals as it enters the viewport.
 * The visual end-state matches the pinned variant.
 */
export default function StoryStackedCard({ story }) {
  return (
    <article className={`${styles.card} ${styles.cardStacked} ${styles[layoutClass(story.layout)]}`}>
      <StoryImageReveal
        src={story.image}
        alt={story.title}
        mode="stacked"
      />
      <StoryTextReveal
        date={story.date}
        title={story.title}
        description={story.description}
        mode="stacked"
      />
    </article>
  )
}

function layoutClass(layout) {
  switch (layout) {
    case 'image-right':  return 'layoutImageRight'
    case 'center-focus': return 'layoutCenterFocus'
    case 'image-left':
    default:             return 'layoutImageLeft'
  }
}
