'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeOnboarding, startCheckout } from './actions'
import { templateCatalog } from '@/config/templateCatalog'
import type { Dict, Lang } from '@/lib/i18n'
// Type-only import — erased at compile time, so this never pulls the
// `server-only` payment-settings module into the client bundle.
import type { PaymentMode } from '@/lib/payments/payment-settings'
import { DEFAULT_BASE_QUOTA, formatIDR, quotaAddonAmount } from '@/lib/payments/quota'
import { buildManualLinks, formatDateLabel, type ManualPayContext, type ManualContact } from '@/lib/payments/manual-pay'
import { Button } from '@/components/ui/Button'
import InvitationDetailsForm, {
  type InvitationValues,
  type TemplateOption,
} from '@/components/onboarding/InvitationDetailsForm'

const TEMPLATE_IDS = templateCatalog.map((t) => t.id)

export default function OnboardingForm({
  email,
  dict,
  lang,
  planBase,
  planPrice,
  planName,
  enabledTemplateIds,
  paymentMode = 'gateway',
  manualContact,
  manualPayDict,
}: {
  email: string
  dict: Dict['onboarding']
  lang: Lang
  planBase?: number
  planPrice?: number
  /** Plan display name (e.g. "Premium") for the manual-mode message; falls back to the plan code. */
  planName?: string
  enabledTemplateIds?: string[]
  // Manual-payment fallback (additive, byte-for-byte unchanged when 'gateway'):
  // the footer hands off to WhatsApp/Email instead of Midtrans checkout.
  paymentMode?: PaymentMode
  manualContact?: ManualContact
  manualPayDict?: Dict['manualPay']
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryTemplate = searchParams.get('template') || ''
  // Only enabled templates are pickable; fall back to the full catalog if the
  // server didn't pass a list (defensive).
  const enabledIds = enabledTemplateIds && enabledTemplateIds.length ? enabledTemplateIds : TEMPLATE_IDS
  const visibleCatalog = templateCatalog.filter((t) => enabledIds.includes(t.id))
  const templateOptions: TemplateOption[] = visibleCatalog.map((t) => ({
    id: t.id,
    label: t.label,
    accent: t.accent,
    tags: t.tags,
  }))
  const initialTemplate = enabledIds.includes(queryTemplate) ? queryTemplate : (visibleCatalog[0]?.id ?? templateCatalog[0].id)
  const plan = searchParams.get('plan') || 'basic'
  const baseQuota = planBase ?? (DEFAULT_BASE_QUOTA[plan] ?? 200)
  const extraParam = parseInt(searchParams.get('extra') || '0', 10) || 0

  const [pending, startTransition] = useTransition()
  const [template, setTemplate] = useState(initialTemplate)
  const [values, setValues] = useState<InvitationValues | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ slug: string; publicUrl: string; dashboardUrl: string } | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Manual mode has no gateway submit — the footer's WhatsApp/Email buttons
    // are the only action. Guard here so an Enter keypress in a field can't
    // trigger completeOnboarding (which would fail for an anonymous visitor).
    if (paymentMode === 'manual') return
    if (!values || !values.valid) return
    setError('')
    startTransition(async () => {
      const result = await completeOnboarding({
        slug: values.slug,
        template: values.template,
        plan: values.plan,
        brideName: values.bride,
        groomName: values.groom,
        weddingDate: values.date,
        venue: values.venue,
        guestQuotaExtra: values.guestExtra,
      })
      if (!result.ok) {
        setError(result.error || dict.form.errFail)
        return
      }
      // Draft created — kick off payment and redirect to the Midtrans invoice.
      if (result.invitationId) {
        const checkout = await startCheckout(result.invitationId)
        if (checkout.ok && checkout.invoiceUrl) {
          window.location.href = checkout.invoiceUrl
          return
        }
      }
      // Checkout couldn't start — fall back to the done panel so the couple can
      // reach the dashboard and pay later from the unpaid banner there.
      setDone({
        slug: result.slug!,
        publicUrl: result.publicUrl!,
        dashboardUrl: result.dashboardUrl!,
      })
    })
  }

  // Manual-mode hand-off: build the same "new purchase" message as
  // ManualOrderModal, straight from the current InvitationValues snapshot.
  // No draft is created and neither completeOnboarding nor startCheckout runs.
  function handleManualSend(channel: 'wa' | 'email') {
    if (!values || !values.valid || !manualContact || !manualPayDict) return
    const templateLabel = templateOptions.find((opt) => opt.id === values.template)?.label ?? values.template
    const ctx: ManualPayContext = {
      kind: 'new',
      templateLabel,
      planName: planName ?? values.plan,
      priceLabel: formatIDR((planPrice ?? 0) + quotaAddonAmount(values.guestExtra)),
      guestTotal: values.guestTotal,
      bride: values.bride,
      groom: values.groom,
      dateLabel: values.date ? formatDateLabel(values.date) : undefined,
      venue: values.venue,
      slug: values.slug,
      lang,
      // Signed-in buyer → include their account email so the operator can create
      // the invitation under that existing account. Anonymous → email is '' → omitted.
      accountEmail: email || undefined,
    }
    const links = buildManualLinks(manualContact, ctx, manualPayDict)
    window.open(channel === 'wa' ? links.waUrl : links.mailtoUrl, '_blank', 'noopener,noreferrer')
  }

  if (done) {
    return (
      <main style={panel}>
        <div style={card}>
          <p style={kicker}>{dict.done.kicker}</p>
          <h1 style={h1}>{dict.done.title}</h1>
          <p style={muted}>
            {dict.done.bodyPrefix} <b>{done.slug}</b>{dict.done.bodySuffix}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <a href={done.publicUrl} target="_blank" rel="noopener noreferrer" style={primaryLink}>
              {dict.done.openPreview}
            </a>
            <button
              type="button"
              onClick={() => router.push(done.dashboardUrl)}
              style={ghostBtn}
            >
              {dict.done.toDashboard}
            </button>
          </div>
          <p style={{ ...muted, fontSize: 13, marginTop: 18 }}>
            {dict.done.tip}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={panel}>
      <form onSubmit={onSubmit} style={card}>
        <header>
          <p style={kicker}>{dict.form.kicker}</p>
          <h1 style={h1}>{dict.form.title}</h1>
          {email && (
            <p style={muted}>
              {dict.form.subtitlePrefix} <b>{email}</b>{dict.form.subtitleSuffix}
            </p>
          )}
        </header>

        <InvitationDetailsForm
          dict={dict}
          lang={lang}
          plan={plan}
          planBase={baseQuota}
          planPrice={planPrice ?? 0}
          templateOptions={templateOptions}
          template={template}
          onTemplateChange={setTemplate}
          extra={extraParam}
          onValidChange={setValues}
          footer={
            paymentMode === 'manual' && manualContact && manualPayDict ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <p style={{ ...muted, fontSize: 13 }}>{manualPayDict.note}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button type="button" disabled={!values?.valid} onClick={() => handleManualSend('wa')}>
                    {manualPayDict.waButton}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!values?.valid}
                    onClick={() => handleManualSend('email')}
                  >
                    {manualPayDict.emailButton}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {error && <p style={errorStyle}>{error}</p>}
                <Button type="submit" disabled={pending || !values?.valid} style={{ marginTop: 8 }}>
                  {pending ? dict.form.submitting : dict.form.submit}
                </Button>
              </>
            )
          }
        />
      </form>
    </main>
  )
}

const panel: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  padding: 36,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: 'var(--interactive-primary)',
  margin: '0 0 8px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: 32,
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.1,
}
const muted: React.CSSProperties = { margin: '8px 0 0', color: 'var(--text-secondary)', lineHeight: 1.6 }
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'var(--interactive-primary-soft)',
  color: 'var(--interactive-primary)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
}
const primaryLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  padding: '0 24px',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  borderRadius: 'var(--radius-pill)',
  textDecoration: 'none',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textAlign: 'center',
  lineHeight: 1,
}
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  padding: '0 20px',
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid rgba(42,33,24,0.3)',
  borderRadius: 'var(--radius-pill)',
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1,
}
