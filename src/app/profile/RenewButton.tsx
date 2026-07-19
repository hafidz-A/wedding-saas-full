'use client'

import { useState, useTransition } from 'react'
import { startCheckout, startRenewal } from '@/app/onboarding/actions'
import ctrl from '@/app/[template]/[slug]/dashboard/dashboardControls.module.css'
// Type-only import — erased at compile time, so this never pulls the
// `server-only` payment-settings module into the client bundle.
import type { PaymentMode } from '@/lib/payments/payment-settings'
import type { ManualContact } from '@/lib/payments/manual-pay'
import type { Dict } from '@/lib/i18n'
import ManualPayModal from '@/components/payments/ManualPayModal'

/**
 * Inline "Bayar / Perpanjang" CTA shown next to each invitation in the
 * profile list when its payment status needs action. Calls the same
 * startCheckout server action as the dashboard banner / PaymentGate and
 * redirects the browser to the Midtrans invoice URL.
 *
 * Manual-payment fallback (additive, byte-for-byte unchanged when 'gateway'):
 * when paymentMode==='manual' the CTA opens ManualPayModal (slug + kind) instead
 * of running startRenewal/startCheckout.
 */
export default function RenewButton({
  invitationId,
  status,
  payNowLabel,
  renewNowLabel,
  processingLabel,
  slug = '',
  planName,
  paymentMode = 'gateway',
  manualContact,
  manualPayDict,
}: {
  invitationId: string
  status: 'draft' | 'expired'
  payNowLabel: string
  renewNowLabel: string
  processingLabel: string
  slug?: string
  planName?: string
  paymentMode?: PaymentMode
  manualContact?: ManualContact
  manualPayDict?: Dict['manualPay']
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [showManualPay, setShowManualPay] = useState(false)
  const label = status === 'expired' ? renewNowLabel : payNowLabel
  // If any manual prop is missing, fall back to the gateway path so the button
  // never dead-ends.
  const manualReady = paymentMode === 'manual' && !!manualContact && !!manualPayDict && !!slug

  function onClick() {
    setErr(null)
    // Manual mode: hand off to the WhatsApp/Email contact modal instead of Midtrans.
    if (manualReady) {
      setShowManualPay(true)
      return
    }
    // Open the payment tab synchronously inside the click (so the popup blocker
    // permits it); navigate it once the invoice URL is ready, or close it on
    // failure. Falls back to same-tab if the browser blocked the popup.
    const payTab = window.open('', '_blank')
    start(async () => {
      // An expired invitation was already paid once, so startCheckout (which
      // refuses paid rows) would silently no-op. Renewals must go through
      // startRenewal, which extends the active period instead.
      const res =
        status === 'expired'
          ? await startRenewal(invitationId)
          : await startCheckout(invitationId)
      if (res.ok && res.invoiceUrl) {
        if (payTab && !payTab.closed) payTab.location.href = res.invoiceUrl
        else window.location.href = res.invoiceUrl
      } else {
        if (payTab && !payTab.closed) payTab.close()
        setErr(res.error ?? 'Gagal memproses. Coba lagi sebentar lagi.')
      }
    })
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <button type="button" onClick={onClick} disabled={pending} className={ctrl.btnPrimarySm}>
        {pending ? processingLabel : label}
      </button>
      {err && <span style={{ fontSize: 11, color: 'var(--interactive-primary-hover)', maxWidth: 220, lineHeight: 1.4 }}>{err}</span>}
      {showManualPay && manualContact && manualPayDict && (
        <ManualPayModal
          contact={manualContact}
          dict={manualPayDict}
          kind={status === 'expired' ? 'renew' : 'pay-draft'}
          slug={slug}
          planName={planName ?? ''}
          onClose={() => setShowManualPay(false)}
        />
      )}
    </span>
  )
}

const btn: React.CSSProperties = {
  height: 36,
  padding: '0 16px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--interactive-primary)',
  color: '#fff',
  border: 0,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
