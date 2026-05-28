'use client'

import styles from './blocks.module.css'

/**
 * Free-form decorative layer — paints a soft radial glow or gradient
 * blob at the specified position. Used for ambience / depth in
 * block-composed sections.
 *
 *   shape:    'orb' | 'mesh' | 'noise'
 *   position: { top, left, right, bottom } (CSS values)
 *   color:    base color
 */
export default function DecorativeLayerBlock({
  shape = 'orb',
  position = { top: '20%', left: '10%' },
  size = 320,
  color = 'rgba(232, 85, 62, 0.20)',
  opacity = 1,
  blur = 60,
}) {
  let background
  if (shape === 'orb') {
    background = `radial-gradient(circle, ${color} 0%, transparent 70%)`
  } else if (shape === 'mesh') {
    background = `conic-gradient(from 30deg at 60% 40%, ${color}, transparent 60%, ${color})`
  } else if (shape === 'noise') {
    background = `radial-gradient(${color} 1px, transparent 1px) 0 0 / 4px 4px`
  }

  return (
    <div
      className={styles.decorative}
      style={{
        ...position,
        width: size,
        height: size,
        opacity,
        background,
        filter: shape === 'noise' ? undefined : `blur(${blur}px)`,
        borderRadius: '50%',
      }}
      aria-hidden="true"
    />
  )
}
