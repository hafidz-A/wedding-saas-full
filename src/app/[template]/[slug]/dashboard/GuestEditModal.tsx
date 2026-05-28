'use client'

import { useState, useTransition } from 'react'
import { updateGuest } from './guests/actions'
import { type GuestRow } from './guests/types'
import { formatPhoneDisplay } from '@/lib/guests/phone'

/**
 * Per-guest edit modal — opened from the GuestsTab "✎" button on each row.
 *
 * 4 fields:
 *   - Nama        → maps to guests.name_enc
 *   - Nomor       → maps to guests.phone_enc (re-normalized server-side)
 *   - Grup        → maps to guests.group_label (plaintext, low-sensitivity)
 *   - Pesan custom → maps to guests.notes_enc. When set, this OVERRIDES the
 *                    global inviteMessageTemplate for THIS guest only. Same
 *                    placeholders ({{name}} / {{url}}) supported.
 */
export default function GuestEditModal({
  slug,
  guest,
  onClose,
}: {
  slug: string
  guest: GuestRow
  onClose: () => void
}) {
  const [name, setName] = useState(guest.name)
  const [phone, setPhone] = useState(formatPhoneDisplay(guest.phone_e164))
  const [group, setGroup] = useState(guest.group_label || '')
  const [notes, setNotes] = useState(guest.notes || '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateGuest(slug, guest.id, {
          name,
          phoneRaw: phone || null,
          groupLabel: group || null,
          notes: notes || null,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal menyimpan')
      }
    })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <h3 style={{ margin: 0 }}>Edit Tamu</h3>
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Tutup">×</button>
        </header>

        <label style={field}>
          <span style={lbl}>Nama</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
        </label>

        <label style={field}>
          <span style={lbl}>Nomor (kosong = pakai contact picker WA)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08123456789"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>Grup (opsional)</span>
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Keluarga, Kantor, dll"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>Pesan custom (kosong = pakai pesan default)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="

            Halo {{nama}}, 
            Dengan hormat kami mengundang Anda untuk hadir di acara pernikahan kami. Detail lengkap & RSVP di tautan berikut:
            {{https://wedding-invitation-1-ryle.vercel.app/(nama-pasangan)}}
            
            Terima kasih 
            "
            style={{ ...input, fontFamily: 'inherit', resize: 'vertical', minHeight: 100 }}
          />
          <span style={hint}>
            Kalau diisi, pesan ini menggantikan pesan default untuk tamu ini saja.
            Tersedia placeholder: <code>{'{{nama}}'}</code> atau <code>{'{{name}}'}</code> (nama tamu) dan{' '}
            <code>{'{{link}}'}</code> atau <code>{'{{url}}'}</code> (link undangan).
          </span>
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Batal</button>
          <button type="button" onClick={onSave} disabled={pending} style={primaryBtn}>
            {pending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </footer>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(20,16,12,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
}
const dialog: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  maxWidth: 520,
  width: '100%',
  // dvh (dynamic viewport height) accounts for mobile browser chrome that
  // expands/collapses on scroll AND for the on-screen keyboard reducing
  // available space — vh on iOS Safari is the full screen height (incl.
  // hidden URL bar) which makes the modal overflow when the keyboard pops up.
  maxHeight: 'min(90vh, 90dvh)',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}
const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  fontSize: 22,
  lineHeight: 1,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
}
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'rgba(42,33,24,0.6)',
  fontWeight: 500,
}
const input: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(42,33,24,0.16)',
  fontSize: 14,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}
const hint: React.CSSProperties = {
  fontSize: 12,
  color: '#5C4A3A',
  lineHeight: 1.5,
}
const primaryBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: '#E8553E',
  color: '#fff',
  border: 0,
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
}
const ghostBtn: React.CSSProperties = {
  padding: '10px 14px',
  background: 'transparent',
  color: '#2A2118',
  border: '1px solid rgba(42,33,24,0.2)',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
}
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'rgba(232,85,62,0.1)',
  color: '#E8553E',
  borderRadius: 10,
  fontSize: 13,
}
