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
import QuotaStepper from '@/components/dashboard/QuotaStepper'
import { startQuotaAddonCheckout, recheckQuotaAddon } from '@/app/onboarding/actions'
import { quotaAddonAmount, QUOTA_CAP, BLOCK_SIZE, formatIDR } from '@/lib/payments/quota'
import type { Dict } from '@/lib/i18n'
// Type-only import — erased at compile time, so this never pulls the
// `server-only` payment-settings module into the client bundle.
import type { PaymentMode } from '@/lib/payments/payment-settings'
import type { ManualContact } from '@/lib/payments/manual-pay'
import ManualPayModal from '@/components/payments/ManualPayModal'
import styles from './GuestsTab.module.css'
import ctrl from './dashboardControls.module.css'

interface Props {
  slug: string
  guests: GuestRow[]
  quota: { used: number; effective: number; invitationId: string }
  publicUrl: string
  messageTemplate?: string
  // Manual-payment fallback (additive, byte-for-byte unchanged when 'gateway'):
  // the guest-quota add-on CTA opens ManualPayModal instead of running
  // startQuotaAddonCheckout.
  planName?: string
  paymentMode?: PaymentMode
  manualContact?: ManualContact
  manualPayDict?: Dict['manualPay']
}

export default function GuestsTab({
  slug,
  guests,
  quota,
  publicUrl,
  messageTemplate,
  planName,
  paymentMode = 'gateway',
  manualContact,
  manualPayDict,
}: Props) {
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

  // Guest-quota state. The meter tracks the LIVE local list so optimistic
  // adds/deletes move it immediately; effective is the paid ceiling.
  const usedLive = localGuests.length
  const isFull = usedLive >= quota.effective
  const roomLeft = Math.max(0, QUOTA_CAP - quota.effective) // how much more quota is buyable
  const [showQuota, setShowQuota] = useState(false)
  const [quotaQty, setQuotaQty] = useState(BLOCK_SIZE)
  const [quotaPending, setQuotaPending] = useState(false)
  const [showManualPay, setShowManualPay] = useState(false)
  const manualReady = paymentMode === 'manual' && !!manualContact && !!manualPayDict

  // On return from a quota-add-on Midtrans checkout (?quota=1), reconcile the
  // payment (in case the webhook was late) then refresh so the meter updates.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('quota') !== '1') return
    recheckQuotaAddon(quota.invitationId).finally(() => {
      window.history.replaceState({}, '', window.location.pathname)
      router.refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buyQuota() {
    // Manual mode: hand off to the WhatsApp/Email contact modal instead of
    // Midtrans. Guard defensively — if the manual props are missing, fall
    // back to the gateway path below so the button never dead-ends.
    if (manualReady) {
      setShowQuota(false)
      setShowManualPay(true)
      return
    }
    setQuotaPending(true)
    const res = await startQuotaAddonCheckout(quota.invitationId, quotaQty)
    if (res.ok && res.invoiceUrl) {
      window.location.href = res.invoiceUrl
      return
    }
    setQuotaPending(false)
    fb.fail(res.error || fm.saveFail)
  }

  // The guest message MUST carry the one-time RSVP code placeholder, or guests
  // can't RSVP (the form requires the 6-digit code). Legacy lovebirds configs
  // were seeded with a message that omitted {{kode}}; upgrade them transparently
  // by appending the localized code line so every sent message still includes it.
  const ensureCode = (s: string) =>
    /\{\{\s*(token|kode)\s*\}\}/i.test(s) ? s : `${s.trimEnd()}${t.codeLineAppend}`
  const initialTemplate = messageTemplate ? ensureCode(messageTemplate) : t.defaultInviteMessage

  // Editable global template state — initialized from invitation config (with the
  // code line ensured), saved server-side via updateInviteMessageTemplate.
  const [template, setTemplate] = useState(initialTemplate)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Whether the template differs from the (code-ensured) baseline.
  const templateDirty = template !== initialTemplate
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

  // Returns true if a guest was actually added (so the caller can reset the
  // form), false if it was empty or the duplicate confirm was cancelled.
  const handleAdd = async (form: FormData): Promise<boolean> => {
    const rawName = String(form.get('name') || '')
    const rawPhone = String(form.get('phone') || '')
    const name = rawName.trim()
    if (!name) return false
    // Hard quota stop (the server also enforces this — this is just instant UX).
    if (localGuests.length >= quota.effective) {
      fb.fail(t.quota.full)
      return false
    }
    // Duplicate guard: same name (case-insensitive) AND same number already on
    // the list → ask first, with an assertive (red) confirm.
    const newPhone = normalizePhone(rawPhone)
    const isDup = localGuests.some(
      (g) => g.name.trim().toLowerCase() === name.toLowerCase() && g.phone_e164 === newPhone,
    )
    if (isDup && !(await confirmDialog({ message: t.dupConfirm.replace('{name}', name), tone: 'danger' }))) {
      return false
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
        // Surface the server message (e.g. "Kuota tamu penuh") when present.
        fb.fail(e instanceof Error && e.message ? e.message : fm.guestAddFail)
      }
    })
    return true
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>{t.title}</h2>
          <p>
            {localGuests.length} {t.countGuests} · {sentCount} {t.countSent} · {pendingCount} {t.countPending}
          </p>
          <p style={{ marginTop: 2, color: isFull ? 'var(--interactive-primary)' : 'var(--text-secondary)' }}>
            {t.quota.meterPrefix} {usedLive} / {quota.effective}
            {isFull && ` — ${t.quota.full}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => { setQuotaQty(Math.min(50, roomLeft)); setShowQuota(true) }}
            className={ctrl.btnPrimarySm}
            disabled={roomLeft <= 0}
            title={roomLeft <= 0 ? `Maksimal ${QUOTA_CAP}` : undefined}
          >
            {t.quota.addBtn}
          </button>
          <button type="button" onClick={() => setShowImport(true)} className={ctrl.btnGhostSm}>
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
          className={ctrl.input}
          style={{ boxSizing: 'border-box', resize: 'vertical', minHeight: 90 }}
        />
        <div className={styles.templatePreview}>
          <span className={styles.templatePreviewLabel}>{t.templatePreviewLabel}</span>
          <pre className={styles.templatePreviewBody}>{previewMessage}</pre>
        </div>
        <div className={styles.templateActions}>
          {templateError && (
            <span style={{ fontSize: 13, color: 'var(--interactive-primary)', marginRight: 'auto' }}>{templateError}</span>
          )}
          {templateSaved && !templateError && (
            <span style={{ fontSize: 13, color: 'var(--color-emerald)', marginRight: 'auto' }}>{t.savedMsg}</span>
          )}
          <button
            type="button"
            onClick={() => setTemplate(initialTemplate)}
            className={ctrl.btnGhostSm}
            disabled={templateSaving || !templateDirty}
          >
            {t.reset}
          </button>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={templateSaving || !templateDirty}
            className={ctrl.btnPrimarySm}
          >
            {templateSaving ? t.saving : t.confirmChange}
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          // React 18 has no reliable auto-reset for an async function `action`,
          // which left the fields filled after a successful add (looked like it
          // failed → re-click → false duplicate). Handle it explicitly and reset
          // the form ourselves only when a guest was actually added.
          e.preventDefault()
          const formEl = e.currentTarget
          void handleAdd(new FormData(formEl)).then((added) => {
            if (added) formEl.reset()
          })
        }}
        className={styles.addForm}
      >
        <input name="name" placeholder={t.namePlaceholder} required className={ctrl.input} />
        <input name="phone" placeholder={t.phonePlaceholder} className={ctrl.input} />
        <button type="submit" disabled={pending} className={ctrl.btnPrimarySm}>
          {t.addBtn}
        </button>
      </form>

      <div className={styles.filterRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className={ctrl.input}
        />
        <div className={ctrl.seg}>
          {(['all', 'pending', 'sent'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`${ctrl.segBtn} ${filter === f ? ctrl.segBtnActive : ''}`}
            >
              {f === 'all' ? t.filterAll : f === 'pending' ? t.filterPending : t.filterSent}
            </button>
          ))}
        </div>
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
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                        color: 'var(--color-emerald)',
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
                        color: 'var(--interactive-primary)',
                      }}
                    >
                      {t.pendingLabel}
                    </span>
                  )}
                  {g.notes && g.notes.trim() && (
                    <span
                      style={{
                        ...badge,
                        background: 'var(--interactive-primary-soft)',
                        color: 'var(--interactive-primary)',
                        marginLeft: 6,
                      }}
                      title={`${t.customTitlePrefix} ${g.notes}`}
                    >
                      {t.customBadge}
                    </span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionRowMain}>
                    <button
                      type="button"
                      onClick={() => handleSend(g)}
                      disabled={pending}
                      className={ctrl.btnPrimarySm}
                    >
                      {g.phone_e164 ? t.sendWa : t.pickContact}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGuest(g)}
                      className={ctrl.btnGhostSm}
                      title={t.editTitle}
                    >
                      ✎
                    </button>
                  </div>

                  <div className={styles.tokenBlock}>
                    <div className={styles.tokenHeader}>
                      {t.tokenLabel} {g.rsvpSubmittedAt ? `(${t.tokenRsvpedBadge})` : g.tokenUsedAt ? `(${t.tokenUsedBadge})` : ''}:
                    </div>
                    <code className={styles.tokenValue}>{g.rsvpToken || '—'}</code>
                  </div>

                  <div className={styles.actionRowBtns}>
                    <button
                      type="button"
                      className={ctrl.btnGhostDanger}
                      style={{ padding: '0 12px', fontSize: '0.78rem' }}
                      onClick={() => handleRegenerate(g)}
                      disabled={pending}
                      aria-label={t.regenerateAria.replace('{name}', g.name)}
                      title={t.regenerateTitle}
                    >
                      <span aria-hidden>↻</span> {t.regenerateBtn}
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
                        className={ctrl.btnGhostSm}
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
                      className={ctrl.btnDelete}
                      title={t.deleteTitle}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
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

      {showQuota && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !quotaPending && setShowQuota(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, background: 'var(--surface-warm)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <h3 style={{ margin: 0, fontSize: 18 }}>{t.quota.modalTitle}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{t.quota.modalHint}</p>
            <QuotaStepper
              value={quotaQty}
              min={50}
              max={Math.max(50, roomLeft)}
              onChange={setQuotaQty}
              typableHint={t.quota.typableHint}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span>{t.quota.totalPrefix}</span>
              <strong>{formatIDR(quotaAddonAmount(quotaQty))}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className={ctrl.btnGhostSm} onClick={() => setShowQuota(false)} disabled={quotaPending}>
                {t.quota.cancel}
              </button>
              <button type="button" className={ctrl.btnPrimarySm} onClick={buyQuota} disabled={quotaPending || roomLeft <= 0}>
                {quotaPending ? t.quota.processing : t.quota.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualPay && manualContact && manualPayDict && (
        <ManualPayModal
          contact={manualContact}
          dict={manualPayDict}
          kind="quota"
          slug={slug}
          planName={planName ?? ''}
          guestTotal={quotaQty}
          onClose={() => setShowManualPay(false)}
        />
      )}
    </div>
  )
}

const badge: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 'var(--radius-pill)',
  fontSize: 11,
  background: 'var(--border-subtle)',
}
