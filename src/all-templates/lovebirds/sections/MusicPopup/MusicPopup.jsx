'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './MusicPopup.module.css'

/**
 * MusicPopup — themed accept/reject overlay for background music.
 *
 *  • Appears bottom-center after `delayMs` (default 1500ms)
 *  • Inherits theme colors via CSS variables (set by ThemeProvider) — fallbacks
 *    to coral/cream if theme not applied.
 *  • On accept: starts looping audio + replaces popup with a small floating
 *    toggle button (mute/unmute) at bottom-right.
 *  • On dismiss: hides forever (within this session).
 *  • Respects browser autoplay policy — `audio.play()` is invoked from a user
 *    click, so it's always allowed.
 *
 * This section is rendered as an OVERLAY (outside SectionRenderer's flow)
 * by InvitationView, so it doesn't take up vertical space in the page.
 */
export default function MusicPopup({
  audioUrl = '',
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

  // Show popup after delay (only if audio URL is set)
  useEffect(() => {
    if (!audioUrl) return undefined
    const t = window.setTimeout(() => setPhase((p) => (p === 'hidden' ? 'shown' : p)), delayMs)
    return () => window.clearTimeout(t)
  }, [audioUrl, delayMs])

  // Try to play when accepted
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || phase !== 'accepted') return
    audio.volume = 0.6
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [phase])

  if (!audioUrl) return null
  if (phase === 'hidden' || phase === 'dismissed') return null

  const wrapperStyle = accentColor
    ? { '--mp-accent': accentColor }
    : undefined

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
