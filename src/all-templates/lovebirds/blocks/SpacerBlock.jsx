'use client'

import styles from './blocks.module.css'

/**
 * Vertical spacer. Use to inject breathing room between blocks.
 *   size: any CSS length, or one of 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 */
const PRESETS = {
  xs: '8px',
  sm: '16px',
  md: '32px',
  lg: '64px',
  xl: '128px',
}

export default function SpacerBlock({ size = 'md' }) {
  const height = PRESETS[size] || size
  return <span className={styles.spacer} style={{ height }} aria-hidden="true" />
}
