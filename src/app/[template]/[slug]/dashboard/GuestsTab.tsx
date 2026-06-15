'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildWhatsAppUrl, renderMessageTemplate } from '@/lib/guests/whatsapp'
import { buildGuestLink } from '@/lib/guests/guestLink'
import { formatPhoneDisplay, normalizePhone } from '@/lib/guests/phone'
import {
  addGuest,
  deleteGuest,
  markGuestSent,
  unmarkGuestSent,
  updateInviteMessageTemplate,
  regenerateGuestToken,
} from './guests/actions'
import { type GuestRow } from './guests/types'
import GuestImportModal from './GuestImportModal'
import GuestEditModal from './GuestEditModal'
import { useDashboardDict } from './DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import styles from './GuestsTab.module.css'

interface Props {
  slug: string
  guests: GuestRow[]
  publicUrl: string
  messageTemplate?: string
}

export default function GuestsTab({ slug, guests, publicUrl, messageTemplate }: Props) {
  const t = useDashboardDict().tabs.guests
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const confirmDialog = useConfirm()
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
  const [template, setTemplate] = useState(messageTemplate || t.defaultInviteMessage)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Whether the template differs from what's saved (gates "confirm change").
  const templateDirty = template !== (messageTemplate || t.defaultInviteMessage)
  // Live preview of the message a guest actually receives (sample guest Ahmad).
  const previewMessage = useMemo(
    () =>
      renderMessageTemplate(template, {
        name: 'Ahmad',
        url: buildGuestLink(publicUrl, 'Ahmad'),
        token: '123456',
      }),
    [template, publicUrl],
  )

  async function saveTemplate() {
    setTemplateSaving(true)
    setTemplateError(null)
    setTemplateSaved(false)
    const result = await updateInviteMessageTemplate(slug, template)
    setTemplateSaving(false)
    if (!result.ok) {
      setTemplateError(result.error || t.saveError)
      fb.fail(fm.saveFail)
      return
    }
    setTemplateSaved(true)
    fb.ok(fm.messageSaved)
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
    const message = renderMessageTemplate(source, {
      name: g.name,
      // Personalized link so the opening gate greets the guest by name.
      url: buildGuestLink(publicUrl, g.name),
      token: g.rsvpToken || '',
    })
    const url = buildWhatsAppUrl({ phoneE164: g.phone_e164, message })
    // Open WA tab immediately (browser permission is tied to user gesture
    // — must happen synchronously inside the click handler, not awaited).
    window.open(url, '_blank', 'noopener,noreferrer')
    fb.ok(fm.waOpened)
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
        fb.fail(fm.waMarkFail)
      }
    })
  }

  const handleRegenerate = async (g: GuestRow) => {
    if (pending) return
    // Warn the owner before regenerating a code for a guest who already RSVP'd:
    // the new code can be used for an ucapan but never to RSVP again.
    if (
      g.rsvpSubmittedAt &&
      !(await confirmDialog({ message: t.regenerateConfirmRsvped.replace('{name}', g.name), tone: 'danger' }))
    ) {
      return
    }
    startTransition(async () => {
      try {
        const { token } = await regenerateGuestToken(slug, g.id)
        // rsvpSubmittedAt is intentionally preserved — regenerate never clears
        // the permanent RSVP-completed marker (mirrors the server).
        setLocalGuests((prev) =>
          prev.map((x) => (x.id === g.id ? { ...x, rsvpToken: token, tokenUsedAt: null } : x)),
        )
        fb.ok(fm.codeRegenerated)
      } catch (e) {
        console.error(e)
        fb.fail(fm.codeRegenFail)
      }
    })
  }

  const handleAdd = async (form: FormData) => {
    const rawName = String(form.get('name') || '')
    const rawPhone = String(form.get('phone') || '')
    const name = rawName.trim()
    if (!name) return
    // Duplicate guard: same name (case-insensitive) AND same number already on
    // the list → ask first, with an assertive (red) confirm.
    const newPhone = normalizePhone(rawPhone)
    const isDup = localGuests.some(
      (g) => g.name.trim().toLowerCase() === name.toLowerCase() && g.phone_e164 === newPhone,
    )
    if (isDup && !(await confirmDialog({ message: t.dupConfirm.replace('{name}', name), tone: 'danger' }))) {
      return
    }
    // Optimistic: drop a temp row in immediately so the user sees instant feedback
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempRow: GuestRow = {
      id: tempId,
      invitation_id: '',
      name,
      phone_e164: null, // will be set properly when server response arrives
      group_label: null,
      notes: null,
      rsvpToken: null,
      tokenUsedAt: null,
      rsvpSubmittedAt: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLocalGuests((prev) => [...prev, tempRow])
    startTransition(async () => {
      try {
        const real = await addGuest(slug, { name, phoneRaw: rawPhone })
        setLocalGuests((prev) => prev.map((x) => (x.id === tempId ? real : x)))
        fb.ok(fm.guestAdded)
      } catch (e) {
        console.error(e)
        // Roll back the temp row on failure
        setLocalGuests((prev) => prev.filter((x) => x.id !== tempId))
        fb.fail(fm.guestAddFail)
      }
    })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>{t.title}</h2>
          <p>
            {localGuests.length} {t.countGuests} · {sentCount} {t.countSent} · {pendingCount} {t.countPending}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => setShowImport(true)} style={ghostBtn}>
            {t.importBtn}
          </button>
        </div>
      </header>

      {/* Always-visible WhatsApp message editor — the owner sees exactly what
          will be sent and can edit it inline, then confirm the change. */}
      <div className={styles.templatePanel}>
        <h3 className={styles.templateHeading}>{t.templateHeading}</h3>
        <p className={styles.templateHint}>{t.templateHint}</p>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={5}
          style={{
            ...input,
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 90,
          }}
        />
        <div className={styles.templatePreview}>
          <span className={styles.templatePreviewLabel}>{t.templatePreviewLabel}</span>
          <pre className={styles.templatePreviewBody}>{previewMessage}</pre>
        </div>
        <div className={styles.templateActions}>
          {templateError && (
            <span style={{ fontSize: 13, color: '#E8553E', marginRight: 'auto' }}>{templateError}</span>
          )}
          {templateSaved && !templateError && (
            <span style={{ fontSize: 13, color: '#2D8C4E', marginRight: 'auto' }}>{t.savedMsg}</span>
          )}
          <button
            type="button"
            onClick={() => setTemplate(messageTemplate || t.defaultInviteMessage)}
            style={ghostBtn}
            disabled={templateSaving || !templateDirty}
          >
            {t.reset}
          </button>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={templateSaving || !templateDirty}
            style={primaryBtn}
          >
            {templateSaving ? t.saving : t.confirmChange}
          </button>
        </div>
      </div>

      <form action={handleAdd} className={styles.addForm}>
        <input name="name" placeholder={t.namePlaceholder} required style={input} />
        <input name="phone" placeholder={t.phonePlaceholder} style={input} />
        <button type="submit" disabled={pending} style={primaryBtn}>
          {t.addBtn}
        </button>
      </form>

      <div className={styles.filterRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
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
            {f === 'all' ? t.filterAll : f === 'pending' ? t.filterPending : t.filterSent}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.colName}</th>
              <th>{t.colPhone}</th>
              <th>{t.colStatus}</th>
              <th style={{ textAlign: 'right' }}>{t.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#5C4A3A' }}>
                  {t.emptyText}
                </td>
              </tr>
            )}
            {filtered.map((g) => (
              <tr key={g.id}>
                <td data-label={t.colName}>
                  {g.name}
                  {g.group_label && <span style={badge}>{g.group_label}</span>}
                </td>
                <td data-label={t.colPhone}>
                  {formatPhoneDisplay(g.phone_e164) || (
                    <span style={{ color: '#aaa' }}>—</span>
                  )}
                </td>
                <td data-label={t.colStatus}>
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
                      {t.sentLabel}{' '}
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
                      {t.pendingLabel}
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
                      title={`${t.customTitlePrefix} ${g.notes}`}
                    >
                      {t.customBadge}
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
                    {g.phone_e164 ? t.sendWa : t.pickContact}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGuest(g)}
                    style={{ ...ghostBtn, marginLeft: 6 }}
                    title={t.editTitle}
                  >
                    ✎
                  </button>
                  <span className={styles.token}>
                    {t.tokenLabel}: <code>{g.rsvpToken || '—'}</code>
                    {g.rsvpSubmittedAt ? (
                      <em className={styles.tokenUsed}> {t.tokenRsvpedBadge}</em>
                    ) : (
                      g.tokenUsedAt && <em className={styles.tokenUsed}> {t.tokenUsedBadge}</em>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.regenBtn}
                    onClick={() => handleRegenerate(g)}
                    disabled={pending}
                    aria-label={t.regenerateAria.replace('{name}', g.name)}
                    title={t.regenerateTitle}
                  >
                    {t.regenerateBtn}
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
                            fb.ok(fm.markUndone)
                          } catch (e) {
                            // restore on failure
                            setLocalGuests((prev) =>
                              prev.map((x) => (x.id === g.id ? { ...x, sent_at: g.sent_at } : x)),
                            )
                            fb.fail(fm.updateFail)
                          }
                        })
                      }}
                      style={{ ...ghostBtn, marginLeft: 6 }}
                      title={t.unmarkTitle}
                    >
                      ↶
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirmDialog({ message: `${t.deleteConfirmPrefix} ${g.name}${t.deleteConfirmSuffix}`, tone: 'danger' }))) return
                      // Optimistic remove
                      setLocalGuests((prev) => prev.filter((x) => x.id !== g.id))
                      startTransition(async () => {
                        try {
                          await deleteGuest(slug, g.id)
                          fb.ok(fm.guestDeleted)
                        } catch (e) {
                          // restore on failure
                          setLocalGuests((prev) => [...prev, g])
                          fb.fail(fm.guestDeleteFail)
                        }
                      })
                    }}
                    style={{ ...ghostBtn, marginLeft: 6, color: '#E8553E' }}
                    title={t.deleteTitle}
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
