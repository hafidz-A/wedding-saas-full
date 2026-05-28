'use client'

import { motion, useTransform } from 'motion/react'
import styles from './OurStory.module.css'

/**
 * Cinematic image reveal — opacity + scale + parallax.
 *
 * NOTE on the previous implementation: it used a top-down `clip-path:
 * inset(N% 0 0 0)` mask. That looks great on desktop but iOS Safari +
 * several mobile browsers fail to interpolate `clip-path` strings driven
 * by motion library, leaving the element stuck at `inset(100%)` = fully
 * hidden. Switching to opacity + scale eliminates the bug everywhere
 * while keeping the cinematic feel (zoom-out + fade).
 *
 * Drives off `localProgress` for the pinned scene. For stacked mode
 * (mobile fallback), uses framer-motion variants + whileInView.
 */
export default function StoryImageReveal({
  src,
  alt = '',
  localProgress,
  mode = 'pinned',
}) {
  if (mode === 'stacked') {
    return (
      <motion.div
        className={styles.imageWrap}
        variants={STACKED_WRAP}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        <motion.img
          src={src}
          alt={alt}
          className={styles.image}
          loading="lazy"
          variants={STACKED_IMG}
        />
      </motion.div>
    )
  }

  return <PinnedReveal src={src} alt={alt} localProgress={localProgress} />
}

function PinnedReveal({ src, alt, localProgress }) {
  // Fade in across the first 35% of the slot — universally supported,
  // GPU-accelerated, no clip-path quirks on mobile.
  const opacity = useTransform(localProgress, [0, 0.35], [0, 1], { clamp: true })
  // Cinematic zoom-out
  const scale = useTransform(localProgress, [0, 0.6], [1.18, 1.0], { clamp: true })
  // Gentle parallax across the entire slot
  const y = useTransform(localProgress, [0, 1], ['-4%', '4%'])

  return (
    <motion.div className={styles.imageWrap} style={{ opacity }}>
      <motion.img
        src={src}
        alt={alt}
        className={styles.image}
        loading="lazy"
        style={{ scale, y }}
      />
    </motion.div>
  )
}

const STACKED_WRAP = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
}

const STACKED_IMG = {
  hidden: { scale: 1.18 },
  visible: {
    scale: 1,
    transition: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
  },
}
