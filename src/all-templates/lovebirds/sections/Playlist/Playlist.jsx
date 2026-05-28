'use client'

import { useState } from 'react'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Playlist.module.css'

const DEFAULTS = {
  title: 'Build the Playlist',
  subtitle: '',
  initialSongs: [],
}

function MusicNote() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V6l11-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  )
}

export default function Playlist(props) {
  const { title, subtitle, initialSongs } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()
  const [songs, setSongs] = useState(initialSongs || [])
  const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!song.trim() || !artist.trim()) return
    setSongs((prev) => [
      { id: `song-${Date.now()}`, song: song.trim(), artist: artist.trim() },
      ...prev,
    ])
    setSong('')
    setArtist('')
  }

  const remove = (id) => setSongs((prev) => prev.filter((s) => s.id !== id))

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Playlist"
    >
      <div className={styles.bgPulse} aria-hidden="true" />

      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Soundtrack the night</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <form className={styles.form} onSubmit={add}>
          <input
            className={styles.input}
            value={song}
            onChange={(e) => setSong(e.target.value)}
            placeholder="Song title"
            aria-label="Song title"
            required
          />
          <input
            className={styles.input}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            aria-label="Artist"
            required
          />
          <button type="submit" className={styles.submit}>
            <MusicNote />
            Add song
          </button>
        </form>

        <ul className={styles.list}>
          {songs.map((s) => (
            <li key={s.id} className={styles.row}>
              <span className={styles.noteIcon}><MusicNote /></span>
              <div className={styles.songMeta}>
                <p className={styles.songTitle}>{s.song}</p>
                <p className={styles.songArtist}>{s.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className={styles.removeBtn}
                aria-label={`Remove ${s.song}`}
              >×</button>
            </li>
          ))}
          {songs.length === 0 && (
            <li className={styles.empty}>The dance floor is waiting — add the first song.</li>
          )}
        </ul>
      </div>
    </section>
  )
}
