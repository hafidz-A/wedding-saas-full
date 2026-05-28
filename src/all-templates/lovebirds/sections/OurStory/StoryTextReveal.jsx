'use client'

import { motion, useTransform } from 'motion/react'
import styles from './OurStory.module.css'

/**
 * Staggered text reveal for a single story:
 *   date → title → description.
 *
 * Pinned mode: each item's opacity + y is derived from localProgress at a
 * different sub-range so the three pieces stagger as the user scrubs the
 * pinned scene.
 *
 * Stacked mode (mobile): items use whileInView variants so they reveal
 * naturally as the card enters the viewport.
 */
export default function StoryTextReveal({
  date,
  title,
  description,
  localProgress,
  mode = 'pinned',
}) {
  if (mode === 'stacked') {
    return (
      <motion.div
        className={styles.text}
        variants={STACKED_CONTAINER}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
      >
        <motion.p className={styles.date} variants={STACKED_ITEM}>{date}</motion.p>
        <motion.h3 className={styles.cardTitle} variants={STACKED_ITEM}>{title}</motion.h3>
        <motion.p className={styles.description} variants={STACKED_ITEM}>
          {description}
        </motion.p>
      </motion.div>
    )
  }

  return <PinnedText date={date} title={title} description={description} localProgress={localProgress} />
}

function PinnedText({ date, title, description, localProgress }) {
  // Date in first — date is the visual anchor for the moment
  const dateO = useTransform(localProgress, [0.05, 0.20], [0, 1], { clamp: true })
  const dateY = useTransform(localProgress, [0.05, 0.20], [18, 0], { clamp: true })

  // Title second
  const titleO = useTransform(localProgress, [0.16, 0.34], [0, 1], { clamp: true })
  const titleY = useTransform(localProgress, [0.16, 0.34], [28, 0], { clamp: true })

  // Description last
  const descO  = useTransform(localProgress, [0.30, 0.50], [0, 1], { clamp: true })
  const descY  = useTransform(localProgress, [0.30, 0.50], [22, 0], { clamp: true })

  return (
    <div className={styles.text}>
      <motion.p className={styles.date} style={{ opacity: dateO, y: dateY }}>
        {date}
      </motion.p>
      <motion.h3 className={styles.cardTitle} style={{ opacity: titleO, y: titleY }}>
        {title}
      </motion.h3>
      <motion.p className={styles.description} style={{ opacity: descO, y: descY }}>
        {description}
      </motion.p>
    </div>
  )
}

const STACKED_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.18 },
  },
}

const STACKED_ITEM = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
  },
}
