'use client'

import { useMemo, useState } from 'react'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Guestbook.module.css'

const DEFAULTS = { title: 'Leave a Note', subtitle: '', initialNotes: [] }

const COLOR_CYCLE = ['gold', 'coral', 'sky', 'emerald', 'purple']

export default function Guestbook(props) {
  const { title, subtitle, initialNotes, slug } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()

  const [notes, setNotes] = useState(() =>
    (initialNotes || []).map((n) => ({ ...n }))
  )
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const rotations = useMemo(
    () => notes.map(() => (Math.random() * 6 - 3).toFixed(2)),
    [notes.length],
  )

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const trimmedName = name.trim()
    const trimmedMessage = message.trim()
    if (!trimmedName || !trimmedMessage) return

    const optimistic = {
      id: `temp-${Date.now()}`,
      name: trimmedName,
      message: trimmedMessage,
      color: COLOR_CYCLE[notes.length % COLOR_CYCLE.length],
    }

    setError(null)
    setSubmitting(true)
    // Optimistic insert at top — user sees their note immediately.
    setNotes((prev) => [optimistic, ...prev])
    setName('')
    setMessage('')

    // Local-only mode (no slug = preview / fallback config) — keep
    // the optimistic note in state so the demo still feels alive.
    if (!slug) {
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: optimistic.name,
          message: optimistic.message,
          color: optimistic.color,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Revert optimistic insert
        setNotes((prev) => prev.filter((n) => n.id !== optimistic.id))
        setName(optimistic.name)
        setMessage(optimistic.message)
        setError(data.error || `Gagal kirim note (${res.status})`)
      } else {
        const data = await res.json()
        // Swap temp ID for the real ID from server
        setNotes((prev) =>
          prev.map((n) => (n.id === optimistic.id ? { ...n, id: data.id } : n)),
        )
      }
    } catch (err) {
      setNotes((prev) => prev.filter((n) => n.id !== optimistic.id))
      setName(optimistic.name)
      setMessage(optimistic.message)
      setError('Network error, coba lagi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Guestbook"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>From the heart</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <form className={styles.form} onSubmit={submit}>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            maxLength={40}
            required
          />
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a short wish…"
            aria-label="Your message"
            rows={3}
            maxLength={240}
            required
          />
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Pinning…' : 'Pin my note'}
          </button>
          {error && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#C43F2A' }}>
              {error}
            </p>
          )}
        </form>

        <div className={styles.grid}>
          {notes.map((note, idx) => (
            <article
              key={note.id}
              className={`${styles.note} ${styles[`color-${note.color || 'gold'}`]}`}
              style={{ '--rot': `${rotations[idx] ?? 0}deg` }}
            >
              <p className={styles.noteMessage}>“{note.message}”</p>
              <p className={styles.noteName}>— {note.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
