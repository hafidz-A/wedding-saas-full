'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

/**
 * Image with optional caption and a few visual variants.
 *
 *   variant: 'floating-frame' | 'round' | 'rounded' | 'bare'
 *   aspect:  CSS aspect-ratio string (e.g. '4 / 5')
 */
export default function ImageBlock({
  src,
  alt = '',
  caption,
  variant = 'rounded',
  aspect,
  reveal = true,
}) {
  const variantClass = styles[`image-${variant.replace('-', '')}`] || styles['image-rounded']
  const style = aspect ? { aspectRatio: aspect } : undefined

  const content = (
    <figure>
      <div className={`${styles.image} ${variantClass}`} style={style}>
        {src && <img src={src} alt={alt} loading="lazy" className={styles.imageImg} />}
      </div>
      {caption && <figcaption className={styles.imageCaption}>{caption}</figcaption>}
    </figure>
  )

  return reveal ? <AnimatedReveal direction="up">{content}</AnimatedReveal> : content
}
