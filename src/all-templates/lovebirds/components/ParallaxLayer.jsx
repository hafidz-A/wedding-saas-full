'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

/**
 * Generic scroll-driven parallax wrapper. Element drifts on Y as the user
 * scrolls, creating a depth effect.
 *
 *   speed > 0  → moves SLOWER than scroll (feels "behind")
 *   speed < 0  → moves OPPOSITE the scroll (feels "in front" / dramatic)
 *   speed = 0  → no parallax (just renders children)
 *
 * If `scrollYProgress` is passed (from a parent useScroll), the wrapper
 * uses that. Otherwise it sets up its own useScroll on the wrapper element.
 */
export default function ParallaxLayer({
  children,
  scrollYProgress,
  speed = 30,
  className,
  axis = 'y',
}) {
  const localRef = useRef(null)
  const local = useScroll({
    target: scrollYProgress ? undefined : localRef,
    offset: ['start end', 'end start'],
  })
  const progress = scrollYProgress || local.scrollYProgress

  const value = useTransform(progress, [0, 1], [speed, -speed])
  const motionStyle = axis === 'x' ? { x: value } : { y: value }

  return (
    <motion.div
      ref={scrollYProgress ? undefined : localRef}
      className={className}
      style={{ ...motionStyle, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}
