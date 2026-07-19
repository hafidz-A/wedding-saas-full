'use client'

import { useState, useTransition } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { startUpgradeCheckout, recheckUpgrade } from '@/app/onboarding/actions'
import type { Dict } from '@/lib/i18n'
// Type-only import — erased at compile time, so this never pulls the
// `server-only` payment-settings module into the client bundle.
import type { PaymentMode } from '@/lib/payments/payment-settings'
import type { ManualContact } from '@/lib/payments/manual-pay'
import ManualPayModal from '@/components/payments/ManualPayModal'

/** Format an IDR amount as "Rp 150.000". */
function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/**
 * Shown in place of the Buku Tamu tab when the invitation isn't on Premium.
 * Explains the lock and offers a "pay the difference" upgrade that keeps the
 * live invitation online. `amountIDR` is the resolved price difference (may be
 * null if it couldn't be resolved — the button still works, the server action
 * recomputes it).
 */
export default function GuestbookLocked({
  invitationId,
  amountIDR,
  slug,
  planName,
  paymentMode = 'gateway',
  manualContact,
  manualPayDict,
}: {
  invitationId: string
  amountIDR: number | null
  // Manual-payment fallback (additive, byte-for-byte unchanged when 'gateway'):
  // the upgrade CTA opens ManualPayModal instead of running startUpgradeCheckout.
  slug?: string
  planName?: string
  paymentMode?: PaymentMode
  manualContact?: ManualContact
  manualPayDict?: Dict['manualPay']
}) {
  const dict = useDashboardDict()
  const t = (dict.tabs as any).guestbookLocked
  const [pending, start] = useTransition()
  const [rechecking, setRechecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const manualReady = paymentMode === 'manual' && !!manualContact && !!manualPayDict && !!slug

  function onUpgrade() {
    // Manual mode: hand off to the WhatsApp/Email contact modal instead of
    // Midtrans. Guard defensively — if the manual props are missing, fall
    // back to the gateway path below so the button never dead-ends.
    if (manualReady) {
      setShowManual(true)
      return
    }
    setError(null)
    start(async () => {
      const res = await startUpgradeCheckout(invitationId)
      if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
      else setError(res.error ?? t.error)
    })
  }

  async function onRecheck() {
    setError(null)
    setRechecking(true)
    try {
      const res = await recheckUpgrade(invitationId)
      if (res.ok && res.published) window.location.reload()
      else setError(t.recheckPending)
    } finally {
      setRechecking(false)
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={lockIcon} aria-hidden>🔒</div>
        <h2 style={title}>{t.title}</h2>
        <p style={body}>{t.body}</p>

        <button type="button" onClick={onUpgrade} disabled={pending} style={cta}>
          {pending
            ? t.processing
            : amountIDR != null
            ? `${t.cta} — ${formatIDR(amountIDR)}`
            : t.cta}
        </button>

        <button type="button" onClick={onRecheck} disabled={rechecking} style={recheckBtn}>
          {rechecking ? t.processing : t.recheck}
        </button>

        {error && <p style={errStyle}>{error}</p>}
      </div>
      {showManual && manualContact && manualPayDict && slug && (
        <ManualPayModal
          contact={manualContact}
          dict={manualPayDict}
          kind="upgrade"
          slug={slug}
          planName={planName ?? ''}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', placeItems: 'center', padding: '40px 16px' }
const card: React.CSSProperties = {
  maxWidth: 460,
  width: '100%',
  textAlign: 'center',
  padding: 36,
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 10px 30px rgba(42,33,24,0.08)',
}
const lockIcon: React.CSSProperties = { fontSize: 34, marginBottom: 8 }
const title: React.CSSProperties = { fontSize: 22, fontWeight: 600, margin: '0 0 8px', color: 'var(--text-primary)' }
const body: React.CSSProperties = { color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 22px', fontSize: 14 }
const cta: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  padding: '1px 20px 0 20px',
  lineHeight: 1,
  borderRadius: 'var(--radius-pill)',
  background: 'var(--interactive-primary)',
  color: '#fff',
  border: 0,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const recheckBtn: React.CSSProperties = {
  display: 'block',
  margin: '14px auto 0',
  padding: '6px 10px',
  background: 'transparent',
  color: 'var(--text-muted)',
  border: 0,
  fontSize: 12,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const errStyle: React.CSSProperties = { color: 'var(--status-error-dark)', fontSize: 13, marginTop: 14 }
