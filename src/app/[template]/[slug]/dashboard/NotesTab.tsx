'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import tabs from './dashboardTabs.module.css'

export interface NoteRow {
  id: string
  guest_name: string
  message: string
  color: string | null
  created_at: string
}

interface Props {
  slug: string
  notes: NoteRow[]
}

const COLOR_DOT: Record<string, string> = {
  gold: '#D4A24A',
  coral: '#E8553E',
  sky: '#3D9BC1',
  emerald: '#2D8C4E',
  purple: '#6B35A8',
}

export default function NotesTab({ slug, notes }: Props) {
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.guest_name.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q),
    )
  }, [notes, query])

  async function deleteNote(id: string) {
    if (!confirm('Hapus note ini? Tindakan tidak bisa dibatalkan.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/guestbook/${id}?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Gagal hapus (${res.status})`)
        return
      }
      // Refresh server data so the list updates without manual reload
      startTransition(() => router.refresh())
    } catch (err: any) {
      alert(err?.message || 'Network error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={tabs.card}>
      <header className={tabs.headerRow}>
        <div>
          <h2>Guestbook Notes</h2>
          <p style={sub}>
            Note dari tamu yang submit di section "Leave a Note". Auto-publish
            ke halaman undangan — kamu bisa hapus dari sini kalau ada yang
            tidak pantas.
          </p>
        </div>
        <div className={tabs.headerActions}>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            style={ghostBtn}
            title="Refetch from Supabase"
          >
            {refreshing ? '…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label="Total notes" value={String(notes.length)} />
        <Stat label="Latest" value={notes[0] ? new Date(notes[0].created_at).toLocaleDateString('id-ID') : '—'} />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder="Cari nama atau pesan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
      </div>

      {notes.length === 0 ? (
        <div className={tabs.empty}>Belum ada note. Tamu yang submit di section "Leave a Note" akan muncul di sini.</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>Tidak ada note yang cocok dengan pencarian.</div>
      ) : (
        <div style={grid}>
          {filtered.map((n) => (
            <article key={n.id} style={noteCard}>
              <span
                style={{
                  ...colorDot,
                  background: COLOR_DOT[n.color || 'gold'] || COLOR_DOT.gold,
                }}
                aria-hidden="true"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={noteMessage}>{n.message}</p>
                <p style={noteMeta}>
                  <strong style={{ color: '#2A2118' }}>{n.guest_name}</strong>{' '}
                  · {new Date(n.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteNote(n.id)}
                disabled={deletingId === n.id}
                style={deleteBtn}
                aria-label="Hapus note"
                title="Hapus note"
              >
                {deletingId === n.id ? '…' : '×'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>{label}</p>
      <p style={statValue}>{value}</p>
    </div>
  )
}

// ── Styles ──
const sub: React.CSSProperties = { margin: '4px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)', maxWidth: 540, lineHeight: 1.5 }
const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }
const statBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 14, border: '1px solid rgba(42,33,24,0.06)' }
const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,33,24,0.55)' }
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 22, color: '#2A2118' }
const searchInput: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }
const noteCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid rgba(42,33,24,0.08)' }
const colorDot: React.CSSProperties = { width: 10, height: 10, borderRadius: '50%', marginTop: 7, flexShrink: 0 }
const noteMessage: React.CSSProperties = { margin: 0, fontSize: 14, color: '#2A2118', lineHeight: 1.5, wordBreak: 'break-word' }
const noteMeta: React.CSSProperties = { margin: '6px 0 0', fontSize: 11, color: 'rgba(42,33,24,0.55)' }
const deleteBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(196,63,42,0.25)', background: 'transparent', color: '#C43F2A', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0, display: 'grid', placeItems: 'center' }
