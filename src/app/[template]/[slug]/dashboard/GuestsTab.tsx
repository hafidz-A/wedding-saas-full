'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildWhatsAppUrl, renderMessageTemplate } from '@/lib/guests/whatsapp'
import { formatPhoneDisplay } from '@/lib/guests/phone'
import {
  addGuest,
  deleteGuest,
  markGuestSent,
  unmarkGuestSent,
  updateInviteMessageTemplate,
} from './guests/actions'
import { type GuestRow } from './guests/types'
import GuestImportModal from './GuestImportModal'
import GuestEditModal from './GuestEditModal'
import styles from './GuestsTab.module.css'

const DEFAULT_TEMPLATE =
  'Halo {{name}}, dengan hormat kami mengundang Anda ke acara pernikahan kami. ' +
  'Detail lengkap di sini: {{url}}'

interface Props {
  slug: string
  guests: GuestRow[]
  publicUrl: string
  messageTemplate?: string
}

export default function GuestsTab({ slug, guests, publicUrl, messageTemplate }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('all')
  const [showImport, setShowImport] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestRow | null>(null)
  const [pending, startTransition] = useTransition()

  // Local mirror of the guests list. Mutations update this state directly
  // (optimistic / immediate) instead of calling router.refresh(), which
  // would re-fetch + re-decrypt the entire dashboard tree. The prop sync
  // below catches external refreshes (e.g. router.refresh() from import).
  const [localGuests, setLocalGuests] = useState<GuestRow[]>(guests)
  useEffect(() => { setLocalGuests(guests) }, [guests])

  // Editable global template state — initialized from invitation config,
  // saved server-side via updateInviteMessageTemplate when "Simpan" clicked.
  const [template, setTemplate] = useState(messageTemplate || DEFAULT_TEMPLATE)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  async function saveTemplate() {
    setTemplateSaving(true)
    setTemplateError(null)
    setTemplateSaved(false)
    const result = await updateInviteMessageTemplate(slug, template)
    setTemplateSaving(false)
    if (!result.ok) {
      setTemplateError(result.error || 'Gagal menyimpan')
      return
    }
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2500)
    router.refresh()
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return localGuests.filter((g) => {
      if (filter === 'sent' && !g.sent_at) return false
      if (filter === 'pending' && g.sent_at) return false
      if (!q) return true
      return (
        g.name.toLowerCase().includes(q) ||
        (g.phone_e164 || '').includes(q) ||
        (g.group_label || '').toLowerCase().includes(q)
      )
    })
  }, [localGuests, query, filter])

  const sentCount = localGuests.filter((g) => g.sent_at).length
  const pendingCount = localGuests.length - sentCount

  const handleSend = (g: GuestRow) => {
    // Per-guest override via notes_enc, fallback to global template.
    const source = g.notes && g.notes.trim() ? g.notes : template
    const message = renderMessageTemplate(source, { name: g.name, url: publicUrl })
    const url = buildWhatsAppUrl({ phoneE164: g.phone_e164, message })
    // Open WA tab immediately (browser permission is tied to user gesture
    // — must happen synchronously inside the click handler, not awaited).
    window.open(url, '_blank', 'noopener,noreferrer')
    // Optimistic: stamp sent_at locally NOW so the badge flips green
    // without waiting for the server round-trip.
    const sentAt = new Date().toISOString()
    setLocalGuests((prev) => prev.map((x) => (x.id === g.id ? { ...x, sent_at: sentAt } : x)))
    startTransition(async () => {
      try {
        await markGuestSent(slug, g.id)
      } catch (e) {
        // Roll back optimistic update on error
        console.error(e)
        setLocalGuests((prev) => prev.map((x) => (x.id === g.id ? { ...x, sent_at: null } : x)))
      }
    })
  }

  const handleAdd = (form: FormData) => {
    const rawName = String(form.get('name') || '')
    const rawPhone = String(form.get('phone') || '')
    const name = rawName.trim()
    if (!name) return
    // Optimistic: drop a temp row in immediately so the user sees instant feedback
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempRow: GuestRow = {
      id: tempId,
      invitation_id: '',
      name,
      phone_e164: null, // will be set properly when server response arrives
      group_label: null,
      notes: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLocalGuests((prev) => [...prev, tempRow])
    startTransition(async () => {
      try {
        const real = await addGuest(slug, { name, phoneRaw: rawPhone })
        setLocalGuests((prev) => prev.map((x) => (x.id === tempId ? real : x)))
      } catch (e) {
        console.error(e)
        // Roll back the temp row on failure
        setLocalGuests((prev) => prev.filter((x) => x.id !== tempId))
      }
    })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>Tamu Undangan</h2>
          <p>
            {localGuests.length} tamu · {sentCount} sudah dikirim · {pendingCount} pending
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => setTemplateOpen((o) => !o)}
            style={{
              ...ghostBtn,
              background: templateOpen ? '#2A2118' : 'transparent',
              color: templateOpen ? '#fff' : '#2A2118',
            }}
          >
            ✎ Pesan Default
          </button>
          <button type="button" onClick={() => setShowImport(true)} style={ghostBtn}>
            + Import
          </button>
        </div>
      </header>

      {templateOpen && (
        <div className={styles.templatePanel}>
          <p className={styles.templateHint}>
            Pesan default ini dipakai untuk <b>semua tamu</b> kecuali tamu yang punya pesan custom sendiri (di-edit per baris).
            Tersedia placeholder: <code>{'{{nama}}'}</code> atau <code>{'{{name}}'}</code> (nama tamu) dan{' '}
            <code>{'{{link}}'}</code> atau <code>{'{{url}}'}</code> (link undangan).
          </p>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={6}
            style={{
              ...input,
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 100,
            }}
          />
          <div className={styles.templateActions}>
            {templateError && (
              <span style={{ fontSize: 13, color: '#E8553E', marginRight: 'auto' }}>{templateError}</span>
            )}
            {templateSaved && !templateError && (
              <span style={{ fontSize: 13, color: '#2D8C4E', marginRight: 'auto' }}>✓ Tersimpan</span>
            )}
            <button
              type="button"
              onClick={() => setTemplate(messageTemplate || DEFAULT_TEMPLATE)}
              style={ghostBtn}
              disabled={templateSaving}
            >
              Reset
            </button>
            <button type="button" onClick={saveTemplate} disabled={templateSaving} style={primaryBtn}>
              {templateSaving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      <form action={handleAdd} className={styles.addForm}>
        <input name="name" placeholder="Nama tamu" required style={input} />
        <input name="phone" placeholder="08123456789 (opsional)" style={input} />
        <button type="submit" disabled={pending} style={primaryBtn}>
          Tambah
        </button>
      </form>

      <div className={styles.filterRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, nomor, grup…"
          style={input}
        />
        {(['all', 'pending', 'sent'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              ...ghostBtn,
              background: filter === f ? '#2A2118' : 'transparent',
              color: filter === f ? '#fff' : '#2A2118',
            }}
          >
            {f === 'all' ? 'Semua' : f === 'pending' ? 'Belum kirim' : 'Sudah'}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Nomor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#5C4A3A' }}>
                  Belum ada tamu. Klik <b>+ Import</b> untuk paste dari spreadsheet, atau tambah satu-satu di atas.
                </td>
              </tr>
            )}
            {filtered.map((g) => (
              <tr key={g.id}>
                <td data-label="Nama">
                  {g.name}
                  {g.group_label && <span style={badge}>{g.group_label}</span>}
                </td>
                <td data-label="Nomor">
                  {formatPhoneDisplay(g.phone_e164) || (
                    <span style={{ color: '#aaa' }}>—</span>
                  )}
                </td>
                <td data-label="Status">
                  {g.sent_at ? (
                    <span
                      style={{
                        ...badge,
                        background: 'rgba(45,140,78,0.15)',
                        color: '#2D8C4E',
                      }}
                      title={new Date(g.sent_at).toLocaleString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    >
                      Terkirim{' '}
                      {new Date(g.sent_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span
                      style={{
                        ...badge,
                        background: 'rgba(232,85,62,0.12)',
                        color: '#E8553E',
                      }}
                    >
                      Pending
                    </span>
                  )}
                  {g.notes && g.notes.trim() && (
                    <span
                      style={{
                        ...badge,
                        background: 'rgba(232,85,62,0.10)',
                        color: '#E8553E',
                        marginLeft: 6,
                      }}
                      title={`Pesan custom: ${g.notes}`}
                    >
                      ✎ custom
                    </span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    onClick={() => handleSend(g)}
                    disabled={pending}
                    style={primaryBtn}
                  >
                    {g.phone_e164 ? 'Kirim WA' : 'Pilih kontak'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGuest(g)}
                    style={{ ...ghostBtn, marginLeft: 6 }}
                    title="Edit tamu (nama, nomor, pesan custom)"
                  >
                    ✎
                  </button>
                  {g.sent_at && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalGuests((prev) =>
                          prev.map((x) => (x.id === g.id ? { ...x, sent_at: null } : x)),
                        )
                        startTransition(async () => {
                          try {
                            await unmarkGuestSent(slug, g.id)
                          } catch (e) {
                            // restore on failure
                            setLocalGuests((prev) =>
                              prev.map((x) => (x.id === g.id ? { ...x, sent_at: g.sent_at } : x)),
                            )
                          }
                        })
                      }}
                      style={{ ...ghostBtn, marginLeft: 6 }}
                      title="Batalkan status terkirim"
                    >
                      ↶
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Hapus ${g.name}?`)) return
                      // Optimistic remove
                      setLocalGuests((prev) => prev.filter((x) => x.id !== g.id))
                      startTransition(async () => {
                        try {
                          await deleteGuest(slug, g.id)
                        } catch (e) {
                          // restore on failure
                          setLocalGuests((prev) => [...prev, g])
                        }
                      })
                    }}
                    style={{ ...ghostBtn, marginLeft: 6, color: '#E8553E' }}
                    title="Hapus"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <GuestImportModal
          slug={slug}
          onClose={() => {
            setShowImport(false)
            router.refresh()
          }}
        />
      )}

      {editingGuest && (
        <GuestEditModal
          slug={slug}
          guest={editingGuest}
          onClose={() => {
            setEditingGuest(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

const input: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid rgba(42,33,24,0.16)',
  borderRadius: 8,
  fontSize: 14,
}
const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#E8553E',
  color: '#fff',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
}
const ghostBtn: React.CSSProperties = {
  padding: '8px 12px',
  background: 'transparent',
  color: '#2A2118',
  border: '1px solid rgba(42,33,24,0.2)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
}
const badge: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  background: 'rgba(42,33,24,0.06)',
}
