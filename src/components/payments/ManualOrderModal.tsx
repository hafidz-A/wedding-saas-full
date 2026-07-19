'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import InvitationDetailsForm, { type InvitationValues } from '@/components/onboarding/InvitationDetailsForm'
import { buildManualLinks, type ManualPayContext, type ManualContact } from '@/lib/payments/manual-pay'
import type { Dict, Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
import { formatIDR, quotaAddonAmount } from '@/lib/payments/quota'
import ctrl from '@/components/ui/controls.module.css'
import styles from './ManualPay.module.css'

/**
 * ManualOrderModal — the manual-payment-fallback "new purchase" popup (call
 * sites A/marketing and B/onboarding, Task 6 of the manual-payment-fallback
 * plan). Reuses `InvitationDetailsForm` (Task 5) with the template locked to
 * whichever plan card the buyer clicked. No draft is created and no auth is
 * required: the typed fields travel only inside a WhatsApp/email message
 * (`buildManualLinks`, Wave A) that the operator re-enters by hand.
 *
 * Modal shell mirrors `LegalModal` (portal, role="dialog", Esc/backdrop
 * close, body-scroll lock) + `PlansModal` (Lenis stop/start +
 * `data-lenis-prevent` so it also works over the Lenis-scrolled marketing
 * landing) with an added Tab focus-trap + focus-restore-on-close.
 */

// A `datetime-local` input value ("YYYY-MM-DDTHH:mm") formatted for a human
// message. String-based (no Date/timezone math) since the value is already a
// naive local time — parsing it through `Date` would risk a TZ-shifted label.
function formatDateLabel(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return v
  const [, y, mo, d, h, mi] = m
  return `${d}/${mo}/${y} ${h}:${mi}`
}

export interface ManualOrderModalProps {
  contact: ManualContact
  dict: Dict['manualPay']
  onbDict: Dict['onboarding']
  lang: Lang
  template: string
  templateLabel: string
  plan: string
  planName: string
  planBase: number
  planPrice: number
  extra?: number
  onClose: () => void
}

export default function ManualOrderModal({
  contact,
  dict,
  onbDict,
  lang,
  template,
  templateLabel,
  plan,
  planName,
  planBase,
  planPrice,
  extra = 0,
  onClose,
}: ManualOrderModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<InvitationValues | null>(null)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  useEscapeToClose(onClose, true)

  // Focus-trap + restore, background scroll lock (html+body, padded for the
  // scrollbar) and Lenis pause — same recipe as PlansModal, generalized with
  // a Tab-key loop so keyboard users can't tab out behind the dialog.
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const body = document.body
    const lenis = (window as { __lenis?: { stop?: () => void; start?: () => void } }).__lenis
    const scrollbarW = window.innerWidth - html.clientWidth
    const prev = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, htmlPadRight: html.style.paddingRight }
    lenis?.stop?.()
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.paddingRight = prev.htmlPadRight
      lenis?.start?.()
      prevActive?.focus?.()
    }
  }, [])

  if (typeof document === 'undefined') return null

  const liveExtra = values?.guestExtra ?? extra
  const totalPrice = planPrice + quotaAddonAmount(liveExtra)

  function buildCtx(): ManualPayContext | null {
    if (!values) return null
    return {
      kind: 'new',
      templateLabel,
      planName,
      priceLabel: formatIDR(planPrice + quotaAddonAmount(values.guestExtra)),
      guestTotal: values.guestTotal,
      bride: values.bride,
      groom: values.groom,
      dateLabel: values.date ? formatDateLabel(values.date) : undefined,
      venue: values.venue,
      slug: values.slug,
      lang,
    }
  }

  function handleSend(channel: 'wa' | 'email') {
    const ctx = buildCtx()
    if (!ctx || !values?.valid) return
    const links = buildManualLinks(contact, ctx, dict)
    window.open(channel === 'wa' ? links.waUrl : links.mailtoUrl, '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  async function handleCopy() {
    const ctx = buildCtx()
    if (!ctx) return
    const links = buildManualLinks(contact, ctx, dict)
    try {
      await navigator.clipboard?.writeText(links.copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable/denied — silently no-op, the WA/email
      // buttons remain the primary path.
    }
  }

  const canSend = Boolean(values?.valid)

  const node = (
    <div className={styles.overlay} onClick={onClose} data-lenis-prevent>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={dict.orderModalTitle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{dict.orderModalTitle}</h2>
            <p className={styles.priceLine}>
              {planName} · {formatIDR(totalPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${ctrl.iconBtn} ${styles.closeBtn}`}
            aria-label={lang === 'id' ? 'Tutup' : 'Close'}
          >
            ×
          </button>
        </header>

        <div className={styles.body} data-lenis-prevent>
          <p className={styles.note}>{dict.note}</p>

          <InvitationDetailsForm
            dict={onbDict}
            lang={lang}
            plan={plan}
            planBase={planBase}
            planPrice={planPrice}
            template={template}
            lockTemplate
            extra={extra}
            onValidChange={setValues}
            footer={
              <div className={styles.footer}>
                <div className={styles.actionsRow}>
                  <Button type="button" disabled={!canSend} onClick={() => handleSend('wa')}>
                    {dict.waButton}
                  </Button>
                  <Button type="button" variant="ghost" disabled={!canSend} onClick={() => handleSend('email')}>
                    {dict.emailButton}
                  </Button>
                </div>
                <div className={styles.copyRow}>
                  <button type="button" onClick={handleCopy} className={styles.copyBtn} disabled={!values}>
                    {dict.copyButton}
                  </button>
                  {copied && <span className={styles.copiedTag}>{dict.copied}</span>}
                </div>
                {sent && <p className={styles.confirmNote}>{dict.confirm}</p>}
              </div>
            }
          />
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
