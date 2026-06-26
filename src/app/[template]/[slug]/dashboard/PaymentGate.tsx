'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { startCheckout, startRenewal } from '@/app/onboarding/actions'
import RecheckPaymentButton from '@/app/profile/RecheckPaymentButton'
import { AuthChrome } from '@/components/site/AuthChrome'
import { useDashboardDict, useDashboardLang } from './DashboardI18nProvider'

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
  const [err, setErr] = useState<string | null>(null)
  const t = useDashboardDict().paymentGate
  const lang = useDashboardLang()
  const isExpired = status === 'expired'

  function onPay() {
    setErr(null)
    // Open the payment tab synchronously inside the click (so the popup blocker
    // permits it); navigate it once the invoice URL is ready, or close it on
    // failure. Falls back to same-tab if the browser blocked the popup.
    const payTab = window.open('', '_blank')
    start(async () => {
      // Expired = already paid once, just out of active period → renew (extend).
      // startCheckout refuses paid rows, so it would silently do nothing here.
      const res = isExpired ? await startRenewal(invitationId) : await startCheckout(invitationId)
      if (res.ok && res.invoiceUrl) {
        if (payTab && !payTab.closed) payTab.location.href = res.invoiceUrl
        else window.location.href = res.invoiceUrl
      } else {
        if (payTab && !payTab.closed) payTab.close()
        setErr(res.error ?? 'Gagal memproses pembayaran. Coba lagi sebentar lagi.')
      }
    })
  }

  return (
    <>
    <AuthChrome lang={lang} />
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

        {err && <p style={{ color: 'var(--interactive-primary-hover)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>{err}</p>}

        <div style={{ marginBottom: 22 }}>
          <RecheckPaymentButton invitationId={invitationId} mode={isExpired ? 'renewal' : 'payment'} />
        </div>

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
    </>
  )
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  padding: 40,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: 'var(--interactive-primary)',
  margin: '0 0 10px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 34,
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.15,
}
const body: React.CSSProperties = {
  margin: '14px 0 22px',
  color: 'var(--text-secondary)',
  lineHeight: 1.65,
  fontSize: 15,
}
const btnRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }
const primaryBtn: React.CSSProperties = {
  padding: '14px 24px', borderRadius: 'var(--radius-pill)', background: 'var(--interactive-primary)', color: '#fff',
  border: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em',
  textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
}
const ghostBtn: React.CSSProperties = {
  padding: '14px 22px', borderRadius: 'var(--radius-pill)', background: 'transparent', color: 'var(--text-primary)',
  border: '1px solid var(--border-strong)', fontSize: 12, letterSpacing: '0.14em',
  textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block',
}
const muted: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--text-muted)' }
const code: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--border-subtle)',
  fontFamily: 'monospace', fontSize: 12,
}
const ftr: React.CSSProperties = {
  marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
}
const ftrLink: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline',
}
const ftrLogout: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'transparent',
  color: 'var(--text-muted)', border: '1px solid var(--border-default)',
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
  fontFamily: 'inherit',
}
