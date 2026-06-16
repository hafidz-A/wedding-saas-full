'use client'

import { useEffect, useRef, useState } from 'react'
import { useYouTubePlayer } from '@/lib/music/useYouTubePlayer'
import styles from './MusicPopup.module.css'

/**
 * MusicPopup — themed accept/reject overlay for background music.
 *
 *  • Appears bottom-center after `delayMs` (default 1500ms)
 *  • Plays a plain audio URL (upload / direct url / library) via <audio>, OR a
 *    YouTube video via a hidden IFrame player when `youtubeId` is set.
 *  • On accept: starts looping audio + replaces popup with a small floating
 *    toggle button (mute/unmute) at bottom-right.
 *  • On dismiss: hides forever (within this session).
 *  • Respects browser autoplay policy — playback is invoked from a user click.
 */
export default function MusicPopup({
  audioUrl = '',
  youtubeId = '',
  title = 'Putar musik latar?',
  subtitle = 'Nikmati pengalaman undangan lebih lengkap',
  acceptLabel = 'Putar',
  dismissLabel = 'Nanti',
  delayMs = 1500,
  loop = true,
  accentColor = undefined,
}) {
  const [phase, setPhase] = useState('hidden') // hidden | shown | accepted | dismissed
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const isYouTube = !!youtubeId
  const active = isYouTube ? !!youtubeId : !!audioUrl
  const yt = useYouTubePlayer({ youtubeId: isYouTube ? youtubeId : null, loop })

  // Show popup after delay (only if a source is set)
  useEffect(() => {
    if (!active) return undefined
    const t = window.setTimeout(() => setPhase((p) => (p === 'hidden' ? 'shown' : p)), delayMs)
    return () => window.clearTimeout(t)
  }, [active, delayMs])

  // Try to play when accepted
  useEffect(() => {
    if (phase !== 'accepted') return
    if (isYouTube) {
      yt.unmute()
      yt.play()
      setIsPlaying(true)
      return
    }
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.6
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [phase, isYouTube, yt])

  if (!active) return null
  if (phase === 'hidden' || phase === 'dismissed') return null

  const wrapperStyle = accentColor ? { '--mp-accent': accentColor } : undefined

  const togglePlay = () => {
    if (isYouTube) {
      if (isPlaying) { yt.pause(); setIsPlaying(false) }
      else { yt.unmute(); yt.play(); setIsPlaying(true) }
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  return (
    <>
      {!isYouTube && <audio ref={audioRef} src={audioUrl} loop={loop} preload="auto" />}

      {phase === 'shown' && (
        <div className={styles.popup} style={wrapperStyle} role="dialog" aria-label="Music permission">
          <span className={styles.icon} aria-hidden="true">♪</span>
          <div className={styles.text}>
            <p className={styles.title}>{title}</p>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <div className={styles.btns}>
            <button
              type="button"
              className={styles.btnDismiss}
              onClick={() => setPhase('dismissed')}
            >
              {dismissLabel}
            </button>
            <button
              type="button"
              className={styles.btnAccept}
              onClick={() => setPhase('accepted')}
            >
              {acceptLabel}
            </button>
          </div>
        </div>
      )}

      {phase === 'accepted' && (
        <button
          type="button"
          className={`${styles.toggle} ${isPlaying ? styles.togglePlaying : ''}`}
          onClick={togglePlay}
          style={wrapperStyle}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      )}
    </>
  )
}
