'use client'

import { motion } from 'motion/react'
import styles from './blocks.module.css'
import { AdatPetal } from '../components/adat/AdatPetals.jsx'

/**
 * Decorative floral SVG layer positioned in a corner of its container.
 * The container must be `position: relative`. Has a gentle floating motion.
 *
 *   position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
 *   variant:  'flower' | 'leaf' | 'bloom'
 */
// Adat motifs replace Lovebirds' coloured flower / leaf / bloom / dots. The
// variant names stay (configs and callers use them); each maps to a motif
// from components/adat/AdatPetals.jsx, painted from the palette.
const VARIANT_TO_MOTIF = { flower: 'kembang', leaf: 'sirih', bloom: 'melati', dots: 'bintang' }
function AdatShape({ variant }) {
  return <AdatPetal name={VARIANT_TO_MOTIF[variant] ?? 'kembang'} style={{ width: '100%', height: '100%', display: 'block' }} />
}

export default function FloralLayerBlock({
  variant = 'flower',
  position = 'top-right',
  size = 100,
  color,
  accent,
  opacity = 0.6,
}) {
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
      <AdatShape variant={variant} />
    </motion.div>
  )
}
