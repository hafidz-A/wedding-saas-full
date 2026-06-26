'use client'

import { useState, useTransition } from 'react'
import { recheckPayment, recheckRenewal } from '@/app/onboarding/actions'

/**
 * "Saya sudah bayar — cek ulang" CTA. Fallback for when the Xendit webhook was
 * missed or delayed: re-queries the invoice and publishes the invitation if it
 * is genuinely paid. Reloads on success; shows an inline note if still pending.
 *
 * Drop it next to <RenewButton> in the profile list and on the dashboard
 * PaymentGate (anywhere the invitation is still an unpaid draft).
 */
export default function RecheckPaymentButton({
  invitationId,
  mode = 'payment',
  label = 'Saya sudah bayar — cek ulang',
  checkingLabel = 'Mengecek…',
  stillPendingLabel = 'Pembayaran belum terkonfirmasi. Tunggu sebentar lalu coba lagi.',
}: {
  invitationId: string
  /** 'payment' rechecks an initial purchase; 'renewal' rechecks an expired-period extension. */
  mode?: 'payment' | 'renewal'
  label?: string
  checkingLabel?: string
  stillPendingLabel?: string
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function onClick() {
    setMsg(null)
    start(async () => {
      const res = mode === 'renewal'
        ? await recheckRenewal(invitationId)
        : await recheckPayment(invitationId)
      if (res.ok && res.published) {
        window.location.reload()
      } else if (res.ok) {
        setMsg(stillPendingLabel)
      } else {
        setMsg(res.error ?? 'Gagal mengecek pembayaran')
      }
    })
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button type="button" onClick={onClick} disabled={pending} style={btn}>
        {pending ? checkingLabel : label}
      </button>
      {msg && <span style={note}>{msg}</span>}
    </span>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-pill)',
  background: 'transparent',
  color: 'var(--interactive-primary)',
  border: '1px solid var(--interactive-primary)',
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
}

const note: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  maxWidth: 280,
  lineHeight: 1.4,
}
