'use client'

import { motion, useTransform } from 'motion/react'
import styles from './BrideGroom.module.css'

/**
 * Decorative SVG element (flower, leaf, dot cluster) absolutely positioned
 * within the section. Has THREE layered motions:
 *
 *   1. PARALLAX  (outer)   — scroll-driven vertical shift for depth
 *   2. FLOAT     (middle)  — perpetual gentle bob + slow rotation
 *   3. SHAPE     (inner)   — the actual SVG, sized via `size`
 *
 * `position` is a CSS positioning object passed to the outer wrapper.
 *   e.g. { top: '6%', left: '4%' }
 *
 * `variant` selects from built-in shape registry below.
 */

const SHAPES = {
  flower: ({ color = '#E8553E', accent = '#F5C842' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50 50)">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse
            key={r}
            cx="0"
            cy="-22"
            rx="9"
            ry="20"
            fill={color}
            opacity="0.85"
            transform={`rotate(${r})`}
          />
        ))}
        <circle r="7" fill={accent} />
        <circle r="3" fill={color} />
      </g>
    </svg>
  ),
  leaf: ({ color = '#2D8C4E' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50 50)">
        <path
          d="M 0 -38 C -20 -18 -20 18 0 38 C 20 18 20 -18 0 -38 Z"
          fill={color}
          opacity="0.78"
        />
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
  dots: ({ color = '#6B35A8' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill={color}>
        <circle cx="20" cy="30" r="4" opacity="0.7" />
        <circle cx="50" cy="20" r="3" opacity="0.55" />
        <circle cx="70" cy="38" r="5" opacity="0.8" />
        <circle cx="35" cy="58" r="3" opacity="0.6" />
        <circle cx="62" cy="72" r="4" opacity="0.7" />
        <circle cx="78" cy="58" r="2.5" opacity="0.5" />
      </g>
    </svg>
  ),
}

export default function FloatingDecoration({
  variant = 'flower',
  position = {},
  scrollYProgress,
  parallaxSpeed = 60,
  floatAmplitude = 12,
  floatDuration = 6,
  spinDuration = 30,        // 0 to disable spinning
  size = 100,
  color,
  accent,
  delay = 0,
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxSpeed, -parallaxSpeed],
  )

  const Shape = SHAPES[variant] || SHAPES.flower
  const floatAnim = { y: [0, -floatAmplitude, 0] }
  if (spinDuration > 0) floatAnim.rotate = 360

  const floatTransition = {
    y: {
      duration: floatDuration,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    },
  }
  if (spinDuration > 0) {
    floatTransition.rotate = {
      duration: spinDuration,
      repeat: Infinity,
      ease: 'linear',
    }
  }

  return (
    <motion.div
      className={styles.decor}
      style={{ ...position, y, willChange: 'transform' }}
      aria-hidden="true"
    >
      <motion.div
        animate={floatAnim}
        transition={floatTransition}
        style={{
          width: size,
          height: size,
          willChange: 'transform',
        }}
      >
        <Shape color={color} accent={accent} />
      </motion.div>
    </motion.div>
  )
}
