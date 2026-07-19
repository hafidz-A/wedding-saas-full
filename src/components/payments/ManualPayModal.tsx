'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildManualLinks, type ManualPayContext, type ManualContact } from '@/lib/payments/manual-pay'
import type { Dict } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
import ctrl from '@/components/ui/controls.module.css'
import styles from './ManualPay.module.css'

/**
 * ManualPayModal — the manual-payment-fallback "existing invitation" contact
 * modal (call sites C–G: PaymentGate, DashboardClient, GuestbookLocked,
 * GuestsTab, RenewButton — Task 7 of the manual-payment-fallback plan). No
 * form: the invitation's `slug` + transaction `kind` are already known (the
 * owner is signed in and viewing their own row), so this is just a WA/Email
 * hand-off built from `buildManualLinks` (Wave A). Same modal shell as
 * `ManualOrderModal` (Task 6) — shares `ManualPay.module.css`.
 */

export interface ManualPayModalProps {
  contact: ManualContact
  dict: Dict['manualPay']
  kind: 'pay-draft' | 'renew' | 'upgrade' | 'quota'
  slug: string
  planName: string
  guestTotal?: number
  onClose: () => void
}

export default function ManualPayModal({
  contact,
  dict,
  kind,
  slug,
  planName,
  guestTotal,
  onClose,
}: ManualPayModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEscapeToClose(onClose, true)

  // Focus-trap + restore, background scroll lock, Lenis pause — identical
  // shell recipe to ManualOrderModal (Task 6) / PlansModal.
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

  // `templateLabel`/`priceLabel` are unused by every non-'new' kind in
  // buildManualMessage (see manual-pay.ts) — empty strings match Wave A's
  // own test fixture for the existing-invitation shape.
  const ctx: ManualPayContext = { kind, templateLabel: '', planName, priceLabel: '', slug, guestTotal }
  const links = buildManualLinks(contact, ctx, dict)

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(links.copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable/denied — silently no-op, the WA/email
      // buttons remain the primary path.
    }
  }

  const node = (
    <div className={styles.overlay} onClick={onClose} data-lenis-prevent>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={dict.contactModalTitle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{dict.contactModalTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className={`${ctrl.iconBtn} ${styles.closeBtn}`} aria-label="Close">
            ×
          </button>
        </header>

        <div className={styles.body} data-lenis-prevent>
          <p className={styles.note}>{dict.note}</p>

          <div className={styles.contactBody}>
            <div className={styles.contactSlugRow}>
              <span className={styles.contactSlugLabel}>{planName}</span>
              <span className={styles.contactSlugValue}>{slug}</span>
            </div>

            <div className={styles.footer}>
              <div className={styles.actionsRow}>
                <Button
                  type="button"
                  onClick={() => window.open(links.waUrl, '_blank', 'noopener,noreferrer')}
                >
                  {dict.waButton}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.open(links.mailtoUrl, '_blank', 'noopener,noreferrer')}
                >
                  {dict.emailButton}
                </Button>
              </div>
              <div className={styles.copyRow}>
                <button type="button" onClick={handleCopy} className={styles.copyBtn}>
                  {dict.copyButton}
                </button>
                {copied && <span className={styles.copiedTag}>{dict.copied}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
