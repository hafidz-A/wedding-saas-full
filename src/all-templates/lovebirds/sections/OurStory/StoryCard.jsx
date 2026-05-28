'use client'

import { motion, useTransform } from 'motion/react'
import StoryImageReveal from './StoryImageReveal.jsx'
import StoryTextReveal from './StoryTextReveal.jsx'
import styles from './OurStory.module.css'

/**
 * A single story scene in the pinned scroll stage.
 *
 *   ──┬── enter ──┬── hold ──┬── exit ──┬──
 *     start                              end
 *
 * Cards stack on top of each other (position: absolute) and cross-fade
 * based on global scroll progress. Keypoints are built per-card so the
 * first card has no enter-fade (visible from progress 0) and the last
 * card has no exit-fade (visible at progress 1), which avoids degenerate
 * "same input" keypoint pairs that previously made later cards stick.
 */
export default function StoryCard({ story, index, total, progress }) {
  const slot = 1 / Math.max(1, total)
  const start = index * slot
  const end   = (index + 1) * slot
  const fade  = slot * 0.22

  const isFirst = index === 0
  const isLast  = index === total - 1

  // Build keypoints without degenerate (equal) input values.
  let oIn, oOut, yIn, yOut
  if (isFirst && isLast) {
    oIn  = [0, 1];                  oOut = [1, 1]
    yIn  = [0, 1];                  yOut = [0, 0]
  } else if (isFirst) {
    oIn  = [0, end - fade, end];    oOut = [1, 1, 0]
    yIn  = [0, end - fade, end];    yOut = [0, 0, -40]
  } else if (isLast) {
    oIn  = [start - fade, start, 1]; oOut = [0, 1, 1]
    yIn  = [start - fade, start, 1]; yOut = [40, 0, 0]
  } else {
    oIn  = [start - fade, start, end - fade, end]; oOut = [0, 1, 1, 0]
    yIn  = [start - fade, start, end - fade, end]; yOut = [40, 0, 0, -40]
  }

  const opacity       = useTransform(progress, oIn,  oOut, { clamp: true })
  const y             = useTransform(progress, yIn,  yOut, { clamp: true })
  const localProgress = useTransform(progress, [start, end], [0, 1], { clamp: true })

  return (
    <motion.article
      className={`${styles.card} ${styles[layoutClass(story.layout)]}`}
      style={{ opacity, y }}
    >
      <StoryImageReveal
        src={story.image}
        alt={story.title}
        localProgress={localProgress}
      />
      <StoryTextReveal
        date={story.date}
        title={story.title}
        description={story.description}
        localProgress={localProgress}
      />
    </motion.article>
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
