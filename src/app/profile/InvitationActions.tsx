'use client'

import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import RenewButton from './RenewButton'
import RecheckPaymentButton from './RecheckPaymentButton'
import ReviewButton, { type ReviewExisting } from './ReviewButton'
import styles from './profile.module.css'
// Type-only imports — erased at compile time, so this never pulls the
// `server-only` payment-settings module into the client bundle.
import type { PaymentMode } from '@/lib/payments/payment-settings'
import type { ManualContact } from '@/lib/payments/manual-pay'
import type { Dict } from '@/lib/i18n'

/**
 * Action row for one invitation card on /profile.
 *
 * Cards with three or fewer actions render a single static row. Cards with
 * more collapse the secondary actions: the collapsed set (primaries + a
 * "+N lainnya" toggle) and the full set (every action + "Lebih sedikit") are
 * two stacked layers. Toggling cross-fades between them — the current set
 * fades out, the other fades in a beat later — while the shell animates its
 * height, so no button ever jump-reflows. Open dashboard + the pay/renew CTA
 * are the "primary" actions and are the ones kept in the collapsed set.
 */
export default function InvitationActions({
  invitationId,
  viewHref,
  dashboardHref,
  periodStatus,
  isPaid,
  isDown,
  defaultName,
  existingReview,
  category,
  labels,
  slug = '',
  planName,
  paymentMode = 'gateway',
  manualContact,
  manualPayDict,
}: {
  invitationId: string
  viewHref: string
  dashboardHref: string
  periodStatus: 'draft' | 'active' | 'expired' | 'lifetime'
  isPaid: boolean
  // Suspended or refunded: the invitation is administratively or permanently down,
  // so the pay/renew CTA, the recheck-payment fallback, and the "Lihat undangan"
  // link all lead nowhere and are withheld. Computed by the caller via
  // invitationIsDown() from the RAW suspended_at — deliberately not from the
  // guest-visibility verdict, which reports a suspended-and-expired invitation as
  // merely 'expired' and would let the renew CTA through.
  isDown: boolean
  defaultName: string
  existingReview: ReviewExisting | null
  category: string
  labels: {
    viewPublic: string
    openDashboard: string
    payNow: string
    renewNow: string
    processing: string
    more: string
    showLess: string
  }
  // Manual-payment fallback — threaded straight to RenewButton (unchanged when 'gateway').
  slug?: string
  planName?: string
  paymentMode?: PaymentMode
  manualContact?: ManualContact
  manualPayDict?: Dict['manualPay']
}) {
  const needsAction = !isDown && (periodStatus === 'draft' || periodStatus === 'expired')
  const [expanded, setExpanded] = useState(false)

  const shellRef = useRef<HTMLDivElement>(null)
  const collapsedRef = useRef<HTMLDivElement>(null)
  const expandedRef = useRef<HTMLDivElement>(null)
  const firstRun = useRef(true)
  const startHeight = useRef<number | null>(null)

  // Action elements. The same element can sit in both layers — React renders an
  // independent instance per position, so only the visible one is interactive.
  const viewEl = (
    <a href={viewHref} target="_blank" rel="noreferrer" className={styles.ghostBtn}>{labels.viewPublic}</a>
  )
  const dashboardEl = <Link href={dashboardHref} className={styles.solidBtn}>{labels.openDashboard}</Link>
  const renewEl = needsAction ? (
    <RenewButton
      invitationId={invitationId}
      status={periodStatus === 'expired' ? 'expired' : 'draft'}
      payNowLabel={labels.payNow}
      renewNowLabel={labels.renewNow}
      processingLabel={labels.processing}
      slug={slug}
      planName={planName}
      paymentMode={paymentMode}
      manualContact={manualContact}
      manualPayDict={manualPayDict}
    />
  ) : null
  const reviewEl = isPaid ? (
    <ReviewButton invitationId={invitationId} defaultName={defaultName} existing={existingReview} category={category} />
  ) : null
  // Manual fallback for a missed webhook — same control the dashboard PaymentGate offers.
  const recheckEl = needsAction ? (
    <RecheckPaymentButton invitationId={invitationId} mode={periodStatus === 'expired' ? 'renewal' : 'payment'} />
  ) : null

  // Full set in display order; primaries are the ones kept when collapsed.
  const all: { key: string; primary: boolean; node: React.ReactNode }[] = [
    ...(isDown ? [] : [{ key: 'view', primary: false, node: viewEl }]),
    { key: 'dashboard', primary: true, node: dashboardEl },
    ...(reviewEl ? [{ key: 'review', primary: false, node: reviewEl }] : []),
    ...(renewEl ? [{ key: 'renew', primary: true, node: renewEl }] : []),
    ...(recheckEl ? [{ key: 'recheck', primary: false, node: recheckEl }] : []),
  ]

  const collapsible = all.length > 3
  const primaries = all.filter((i) => i.primary)
  const hiddenCount = all.length - primaries.length

  // Animate the shell height between the two layers' natural heights while the
  // layers cross-fade. The pre-toggle height is captured in the click handler
  // (startHeight) because by the time this effect runs the new layer is already
  // in flow, so the shell's natural height is already the target.
  useLayoutEffect(() => {
    if (!collapsible) return
    const shell = shellRef.current
    const active = expanded ? expandedRef.current : collapsedRef.current
    const inactive = expanded ? collapsedRef.current : expandedRef.current
    if (!shell || !active) return

    // Keep the hidden layer out of the tab order / a11y tree.
    if (inactive) inactive.inert = true
    active.inert = false

    // Let the shell settle at its natural (target) height…
    shell.style.height = 'auto'
    const target = active.offsetHeight

    if (firstRun.current) {
      firstRun.current = false
      return
    }

    const start = startHeight.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || start == null || Math.abs(start - target) < 1 || typeof shell.animate !== 'function') return

    // …then animate the visual height from the pre-toggle value up/down to it.
    // fill:'none' (default) means the shell reverts to its natural 'auto' height
    // the moment the animation ends or is cancelled, so it can never be left
    // clipped at an intermediate frame.
    const anim = shell.animate(
      [{ height: `${start}px` }, { height: `${target}px` }],
      { duration: 340, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
    )
    return () => anim.cancel()
  }, [expanded, collapsible])

  function toggle(next: boolean) {
    const shell = shellRef.current
    if (shell) startHeight.current = shell.getBoundingClientRect().height
    setExpanded(next)
  }

  const chevron = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )

  if (!collapsible) {
    return (
      <div className={styles.actionRow}>
        {all.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
      </div>
    )
  }

  return (
    <div ref={shellRef} className={styles.actionsShell}>
      <div ref={collapsedRef} className={expanded ? styles.layer : `${styles.layer} ${styles.layerActive}`}>
        {primaries.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
        <button type="button" className={styles.toggleBtn} aria-expanded={false} onClick={() => toggle(true)}>
          {`+${hiddenCount} ${labels.more}`}
          {chevron}
        </button>
      </div>

      <div ref={expandedRef} className={expanded ? `${styles.layer} ${styles.layerActive}` : styles.layer}>
        {all.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
        <button type="button" className={styles.toggleBtn} aria-expanded onClick={() => toggle(false)}>
          {labels.showLess}
          {chevron}
        </button>
      </div>
    </div>
  )
}
