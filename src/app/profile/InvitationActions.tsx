'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import RenewButton from './RenewButton'
import RecheckPaymentButton from './RecheckPaymentButton'
import ReviewButton, { type ReviewExisting } from './ReviewButton'
import styles from './profile.module.css'

/**
 * Action row for one invitation card on /profile. Every action stays a real
 * pill (as in the mockup); the only change is that once a card carries more
 * than three of them, the secondary ones collapse behind a "+N lainnya /
 * Lebih sedikit" toggle so the row never wraps into an ugly stack. Cards with
 * three or fewer actions render exactly as before — no toggle.
 *
 * "Primary" actions (Open dashboard + the pay/renew CTA) always stay visible;
 * the toggle only ever hides secondary actions.
 */
export default function InvitationActions({
  invitationId,
  viewHref,
  dashboardHref,
  periodStatus,
  isPaid,
  defaultName,
  existingReview,
  labels,
}: {
  invitationId: string
  viewHref: string
  dashboardHref: string
  periodStatus: 'draft' | 'active' | 'expired' | 'lifetime'
  isPaid: boolean
  defaultName: string
  existingReview: ReviewExisting | null
  labels: {
    viewPublic: string
    openDashboard: string
    payNow: string
    renewNow: string
    processing: string
    more: string
    showLess: string
  }
}) {
  const needsAction = periodStatus === 'draft' || periodStatus === 'expired'
  const [expanded, setExpanded] = useState(false)

  // Declared in display order; `primary` items never collapse.
  const items: { key: string; primary: boolean; node: React.ReactNode }[] = [
    {
      key: 'view',
      primary: false,
      node: <a href={viewHref} target="_blank" rel="noreferrer" className={styles.ghostBtn}>{labels.viewPublic}</a>,
    },
    {
      key: 'dashboard',
      primary: true,
      node: <Link href={dashboardHref} className={styles.solidBtn}>{labels.openDashboard}</Link>,
    },
  ]
  if (isPaid) {
    items.push({
      key: 'review',
      primary: false,
      node: <ReviewButton invitationId={invitationId} defaultName={defaultName} existing={existingReview} />,
    })
  }
  if (needsAction) {
    items.push({
      key: 'renew',
      primary: true,
      node: (
        <RenewButton
          invitationId={invitationId}
          status={periodStatus === 'expired' ? 'expired' : 'draft'}
          payNowLabel={labels.payNow}
          renewNowLabel={labels.renewNow}
          processingLabel={labels.processing}
        />
      ),
    })
    // Manual fallback for a missed webhook — same control the dashboard
    // PaymentGate offers, here too.
    items.push({
      key: 'recheck',
      primary: false,
      node: <RecheckPaymentButton invitationId={invitationId} mode={periodStatus === 'expired' ? 'renewal' : 'payment'} />,
    })
  }

  const collapsible = items.length > 3
  const visible = !collapsible || expanded ? items : items.filter((i) => i.primary)
  const hiddenCount = items.length - visible.length

  return (
    <span className={styles.actions}>
      {visible.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}

      {collapsible && (
        <button
          type="button"
          className={styles.toggleBtn}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? labels.showLess : `+${hiddenCount} ${labels.more}`}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </span>
  )
}
