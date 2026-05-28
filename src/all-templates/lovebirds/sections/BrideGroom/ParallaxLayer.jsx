'use client'

import { motion, useTransform } from 'motion/react'

/**
 * Scroll-driven vertical parallax wrapper. The wrapped element moves
 * along Y as the section's scrollYProgress changes, creating depth.
 *
 *   speed = 30  → element shifts 30px down at start, 30px up at end
 *                 (slower than scroll, "behind" feel)
 *   speed = -60 → element moves opposite the scroll (more dramatic depth)
 *
 * Pass the same `scrollYProgress` motion value from the section's
 * useScroll() so every parallax element stays synchronized.
 */
export default function ParallaxLayer({
  children,
  scrollYProgress,
  speed = 30,
  className,
}) {
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])

  return (
    <motion.div
      className={className}
      style={{ y, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}
