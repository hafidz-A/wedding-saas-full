'use client'

import { useTransition } from 'react'
import { startCheckout } from '@/app/onboarding/actions'

/**
 * Inline "Bayar / Perpanjang" CTA shown next to each invitation in the
 * profile list when its payment status needs action. Calls the same
 * startCheckout server action as the dashboard banner / PaymentGate and
 * redirects the browser to the Xendit invoice URL.
 */
export default function RenewButton({
  invitationId,
  status,
  payNowLabel,
  renewNowLabel,
  processingLabel,
}: {
  invitationId: string
  status: 'draft' | 'expired'
  payNowLabel: string
  renewNowLabel: string
  processingLabel: string
}) {
  const [pending, start] = useTransition()
  const label = status === 'expired' ? renewNowLabel : payNowLabel

  function onClick() {
    start(async () => {
      const res = await startCheckout(invitationId)
      if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
    })
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} style={btn}>
      {pending ? processingLabel : label}
    </button>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  background: '#E8553E',
  color: '#fff',
  border: 0,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
}
