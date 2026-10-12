'use client'

import { motion, useTransform } from 'motion/react'
import styles from './BrideGroom.module.css'
import { AdatPetal } from '../../components/adat/AdatPetals.jsx'

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

// Adat motifs replace Lovebirds' coloured flower / leaf / bloom / dots. The
// variant names stay (configs and callers use them); each maps to a motif
// from components/adat/AdatPetals.jsx, painted from the palette.
const VARIANT_TO_MOTIF = { flower: 'kembang', leaf: 'sirih', bloom: 'melati', dots: 'bintang' }
function AdatShape({ variant }) {
  return <AdatPetal name={VARIANT_TO_MOTIF[variant] ?? 'kembang'} style={{ width: '100%', height: '100%', display: 'block' }} />
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
        <AdatShape variant={variant} />
      </motion.div>
    </motion.div>
  )
}
