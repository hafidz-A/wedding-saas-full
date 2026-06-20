'use client'

import { useState, useTransition } from 'react'
import { startCheckout, startRenewal } from '@/app/onboarding/actions'

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
  const [err, setErr] = useState<string | null>(null)
  const label = status === 'expired' ? renewNowLabel : payNowLabel

  function onClick() {
    setErr(null)
    start(async () => {
      // An expired invitation was already paid once, so startCheckout (which
      // refuses paid rows) would silently no-op. Renewals must go through
      // startRenewal, which extends the active period instead.
      const res =
        status === 'expired'
          ? await startRenewal(invitationId)
          : await startCheckout(invitationId)
      if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
      else setErr(res.error ?? 'Gagal memproses. Coba lagi sebentar lagi.')
    })
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <button type="button" onClick={onClick} disabled={pending} style={btn}>
        {pending ? processingLabel : label}
      </button>
      {err && <span style={{ fontSize: 11, color: '#C43F2A', maxWidth: 220, lineHeight: 1.4 }}>{err}</span>}
    </span>
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
