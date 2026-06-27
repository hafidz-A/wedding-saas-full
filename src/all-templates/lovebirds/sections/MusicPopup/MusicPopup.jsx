'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './MusicPopup.module.css'

/**
 * MusicPopup — themed accept/reject overlay for background music.
 *
 *  • Appears bottom-center after `delayMs` (default 1500ms)
 *  • Plays an uploaded MP3 via <audio>.
 *  • On accept: starts looping audio + replaces popup with a small floating
 *    toggle button (pause/play) at bottom-right.
 *  • On dismiss: hides forever (within this session).
 *  • CRITICAL: audio.play() MUST be called in the DIRECT click handler call
 *    stack — iOS/Android browsers reject play() from useEffect / setTimeout
 *    because they require a synchronous user-gesture context.
 */
export default function MusicPopup({
  audioUrl = '',
  youtubeId: _youtubeId = '',
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

  const active = !!audioUrl

  // Show popup after delay (only if a source is set)
  useEffect(() => {
    if (!active) return undefined
    const t = window.setTimeout(() => setPhase((p) => (p === 'hidden' ? 'shown' : p)), delayMs)
    return () => window.clearTimeout(t)
  }, [active, delayMs])

  if (!active) return null
  if (phase === 'hidden' || phase === 'dismissed') return null

  const wrapperStyle = accentColor ? { '--mp-accent': accentColor } : undefined

  /**
   * Accept music — called DIRECTLY from onClick (user gesture).
   * audio.play() stays in the synchronous call stack of the tap/click so
   * mobile browsers allow it.
   */
  const acceptAndPlay = () => {
    setPhase('accepted')
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.6
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }

  const togglePlay = () => {
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
      <audio ref={audioRef} src={audioUrl} loop={loop} preload="auto" />

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
              onClick={acceptAndPlay}
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
