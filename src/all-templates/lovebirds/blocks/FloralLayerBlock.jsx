'use client'

import { motion } from 'motion/react'
import styles from './blocks.module.css'

/**
 * Decorative floral SVG layer positioned in a corner of its container.
 * The container must be `position: relative`. Has a gentle floating motion.
 *
 *   position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
 *   variant:  'flower' | 'leaf' | 'bloom'
 */
const SHAPES = {
  flower: ({ color = '#E8553E', accent = '#F5C842' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50 50)">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse key={r} cx="0" cy="-22" rx="9" ry="20" fill={color} opacity="0.85" transform={`rotate(${r})`} />
        ))}
        <circle r="7" fill={accent} />
        <circle r="3" fill={color} />
      </g>
    </svg>
  ),
  leaf: ({ color = '#2D8C4E' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50 50)">
        <path d="M 0 -38 C -20 -18 -20 18 0 38 C 20 18 20 -18 0 -38 Z" fill={color} opacity="0.78" />
        <path d="M 0 -32 L 0 32" stroke={color} strokeWidth="1.4" fill="none" opacity="0.95" />
      </g>
    </svg>
  ),
  bloom: ({ color = '#F5C842', accent = '#E8553E' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50 50)">
        {[0, 72, 144, 216, 288].map((r) => (
          <path
            key={r}
            d="M 0 -30 C 10 -26 13 -14 7 -4 C 3 -8 -3 -8 -7 -4 C -13 -14 -10 -26 0 -30 Z"
            fill={color}
            opacity="0.85"
            transform={`rotate(${r})`}
          />
        ))}
        <circle r="6" fill={accent} />
      </g>
    </svg>
  ),
}

export default function FloralLayerBlock({
  variant = 'flower',
  position = 'top-right',
  size = 100,
  color,
  accent,
  opacity = 0.6,
}) {
  const Shape = SHAPES[variant] || SHAPES.flower
  return (
    <motion.div
      className={`${styles.floral} ${styles[`floralPos-${position}`]}`}
      style={{ width: size, height: size, opacity }}
      animate={{ y: [0, -10, 0], rotate: 360 }}
      transition={{
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
      }}
      aria-hidden="true"
    >
      <Shape color={color} accent={accent} />
    </motion.div>
  )
}
