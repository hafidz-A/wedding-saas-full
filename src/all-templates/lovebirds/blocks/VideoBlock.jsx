'use client'

import AnimatedReveal from '../components/AnimatedReveal.jsx'
import styles from './blocks.module.css'

/**
 * Video block — supports both `<iframe>` embeds (YouTube/Vimeo URL via `src`)
 * and direct `<video>` files (mp4 via `file`). Defaults to 16:9 aspect.
 */
export default function VideoBlock({
  src,
  file,
  poster,
  autoplay = false,
  muted = true,
  loop = false,
  controls = true,
  aspect = '16 / 9',
  reveal = true,
}) {
  const style = { aspectRatio: aspect }

  const body = file ? (
    <video
      src={file}
      poster={poster}
      autoPlay={autoplay}
      muted={muted}
      loop={loop}
      controls={controls}
      playsInline
    />
  ) : src ? (
    <iframe
      src={src}
      title="Video"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  ) : null

  const content = <div className={styles.video} style={style}>{body}</div>
  return reveal ? <AnimatedReveal direction="up">{content}</AnimatedReveal> : content
}
