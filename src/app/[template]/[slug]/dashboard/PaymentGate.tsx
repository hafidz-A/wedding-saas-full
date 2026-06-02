'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { startCheckout } from '@/app/onboarding/actions'
import RecheckPaymentButton from '@/app/profile/RecheckPaymentButton'
import { useDashboardDict } from './DashboardI18nProvider'

/**
 * Full-screen gate shown in place of the dashboard when payment is required:
 *
 *   - status === 'draft'   → the couple has never paid; "Bayar Dulu" with a
 *                            link to preview their own (still-unpublished)
 *                            invitation while they decide.
 *   - status === 'expired' → the couple's active period ran out; "Perpanjang"
 *                            CTA only. No preview link because the public
 *                            view itself goes offline when expired.
 *
 * Both paths use the same startCheckout server action that the unpaid banner
 * uses, so payment plumbing stays in one place.
 */
export default function PaymentGate({
  invitationId,
  slug,
  template,
  status,
}: {
  invitationId: string
  slug: string
  template: string
  status: 'draft' | 'expired'
}) {
  const [pending, start] = useTransition()
  const t = useDashboardDict().paymentGate
  const isExpired = status === 'expired'

  function onPay() {
    start(async () => {
      const res = await startCheckout(invitationId)
      if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
    })
  }

  return (
    <main style={shell}>
      <div style={card}>
        <p style={kicker}>{isExpired ? t.expiredKicker : t.draftKicker}</p>
        <h1 style={h1}>{isExpired ? t.expiredTitle : t.draftTitle}</h1>
        <p style={body}>{isExpired ? t.expiredBody : t.draftBody}</p>

        <div style={btnRow}>
          <button type="button" onClick={onPay} disabled={pending} style={primaryBtn}>
            {pending ? t.processing : isExpired ? t.expiredPayBtn : t.draftPayBtn}
          </button>
          {!isExpired && (
            <Link href={`/${template}/${slug}`} style={ghostBtn}>
              {t.previewLink}
            </Link>
          )}
        </div>

        {!isExpired && (
          <div style={{ marginBottom: 22 }}>
            <RecheckPaymentButton invitationId={invitationId} />
          </div>
        )}

        <p style={muted}>
          {t.slugLabel}: <code style={code}>{slug}</code>
        </p>

        <footer style={ftr}>
          <Link href="/" style={ftrLink}>{t.backHome}</Link>
          <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
            <button type="submit" style={ftrLogout}>{t.logout}</button>
          </form>
        </footer>
      </div>
    </main>
  )
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  padding: 40,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 22,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: '#E8553E',
  margin: '0 0 10px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 34,
  margin: 0,
  color: '#2A2118',
  lineHeight: 1.15,
}
const body: React.CSSProperties = {
  margin: '14px 0 22px',
  color: '#5C4A3A',
  lineHeight: 1.65,
  fontSize: 15,
}
const btnRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }
const primaryBtn: React.CSSProperties = {
  padding: '14px 24px', borderRadius: 999, background: '#E8553E', color: '#fff',
  border: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em',
  textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
}
const ghostBtn: React.CSSProperties = {
  padding: '14px 22px', borderRadius: 999, background: 'transparent', color: '#2A2118',
  border: '1px solid rgba(42,33,24,0.2)', fontSize: 12, letterSpacing: '0.14em',
  textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block',
}
const muted: React.CSSProperties = { margin: 0, fontSize: 12, color: 'rgba(42,33,24,0.55)' }
const code: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 6, background: 'rgba(42,33,24,0.08)',
  fontFamily: 'monospace', fontSize: 12,
}
const ftr: React.CSSProperties = {
  marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(42,33,24,0.08)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
}
const ftrLink: React.CSSProperties = {
  fontSize: 12, color: 'rgba(42,33,24,0.6)', textDecoration: 'underline',
}
const ftrLogout: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 999, background: 'transparent',
  color: 'rgba(42,33,24,0.6)', border: '1px solid rgba(42,33,24,0.18)',
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
  fontFamily: 'inherit',
}
