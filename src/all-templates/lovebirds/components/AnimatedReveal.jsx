'use client'

import { motion } from 'motion/react'

/**
 * Generic reveal wrapper — fade + slide up when entering the viewport.
 *
 * Pass `preset` for common variants or pass raw `initial` / `whileInView`.
 * Direction options: 'up' | 'down' | 'left' | 'right' | 'fade'
 *
 *   <AnimatedReveal direction="up">
 *     <h2>...</h2>
 *   </AnimatedReveal>
 */
const DIRECTIONS = {
  up:    { y: 32, x: 0 },
  down:  { y: -32, x: 0 },
  left:  { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  fade:  { x: 0, y: 0 },
}

export default function AnimatedReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.85,
  once = true,
  amount = 0.3,
  className,
  as: Tag = 'div',
}) {
  const offsets = DIRECTIONS[direction] || DIRECTIONS.up
  const MotionTag = motion[Tag] || motion.div

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, ...offsets }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  )
}
