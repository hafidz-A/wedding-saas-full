'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeOnboarding, checkSlugAvailable, startCheckout } from './actions'
import { templateCatalog } from '@/config/templateCatalog'
import type { Dict, Lang } from '@/lib/i18n'
import { LangToggle } from '@/components/site/LangToggle'

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
}

const TEMPLATE_IDS = templateCatalog.map((t) => t.id)

export default function OnboardingForm({ email, dict, lang }: { email: string; dict: Dict['onboarding']; lang: Lang }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryTemplate = searchParams.get('template') || ''
  const initialTemplate = TEMPLATE_IDS.includes(queryTemplate) ? queryTemplate : templateCatalog[0].id
  const plan = searchParams.get('plan') || 'basic'

  const [pending, startTransition] = useTransition()
  const [template, setTemplate] = useState(initialTemplate)
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ slug: string; publicUrl: string; dashboardUrl: string } | null>(null)
  const [slugStatus, setSlugStatus] = useState<{ checking?: boolean; available?: boolean; reason?: string }>(
    {},
  )

  // Auto-suggest slug from bride+groom first names until user edits it themselves
  useEffect(() => {
    if (slugTouched) return
    const a = firstWord(bride)
    const b = firstWord(groom)
    if (a && b) setSlug(`${a}-${b}`)
    else if (a) setSlug(a)
    else if (b) setSlug(b)
  }, [bride, groom, slugTouched])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug) {
      setSlugStatus({})
      return
    }
    setSlugStatus({ checking: true })
    const t = setTimeout(async () => {
      const res = await checkSlugAvailable(slug)
      setSlugStatus({ checking: false, ...res })
    }, 400)
    return () => clearTimeout(t)
  }, [slug])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await completeOnboarding({
        slug,
        template,
        plan,
        brideName: bride,
        groomName: groom,
        weddingDate: date,
        venue,
      })
      if (!result.ok) {
        setError(result.error || dict.form.errFail)
        return
      }
      // Draft created — kick off payment and redirect to the Xendit invoice.
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

  const slugOk = slug && slugStatus.available && !slugStatus.checking

  return (
    <main style={panel}>
      <form onSubmit={onSubmit} style={card}>
        <header>
          <p style={kicker}>{dict.form.kicker}</p>
          <h1 style={h1}>{dict.form.title}</h1>
          <p style={muted}>
            {dict.form.subtitlePrefix} <b>{email}</b>{dict.form.subtitleSuffix}
          </p>
        </header>

        <div style={field}>
          <span style={lbl}>{dict.form.pickTemplate}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {templateCatalog.map((t) => {
              const active = t.id === template
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: active
                      ? `2px solid ${t.accent || 'var(--color-charcoal)'}`
                      : '1px solid var(--border-default)',
                    background: active ? 'rgba(42,33,24,0.04)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
                    {t.label}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                    {t.tags.join(' · ')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ ...field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={lbl}>{dict.form.language}</span>
          <LangToggle lang={lang} label={dict.form.language} />
        </div>

        <label style={field}>
          <span style={lbl}>{dict.form.bride}</span>
          <input
            value={bride}
            onChange={(e) => setBride(e.target.value)}
            placeholder={dict.form.bridePlaceholder}
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>{dict.form.groom}</span>
          <input
            value={groom}
            onChange={(e) => setGroom(e.target.value)}
            placeholder={dict.form.groomPlaceholder}
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>{dict.form.date}</span>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>{dict.form.venue}</span>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={dict.form.venuePlaceholder}
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>{dict.form.url}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>weddingsite/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase())
              }}
              placeholder={dict.form.urlPlaceholder}
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              style={{ ...input, flex: 1 }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color:
                slugStatus.checking
                  ? 'var(--text-secondary)'
                  : slugStatus.available
                  ? 'var(--color-emerald)'
                  : slugStatus.reason
                  ? 'var(--interactive-primary)'
                  : 'var(--color-charcoal-light)',
              marginTop: 4,
            }}
          >
            {slug && slugStatus.checking && dict.form.checking}
            {slug && !slugStatus.checking && slugStatus.available && dict.form.available}
            {slug && !slugStatus.checking && slugStatus.reason && `✗ ${slugStatus.reason}`}
            {!slug && dict.form.urlHelp}
          </span>
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={pending || !slugOk} style={submitBtn}>
          {pending ? dict.form.submitting : dict.form.submit}
        </button>
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
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 32,
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.1,
}
const muted: React.CSSProperties = { margin: '8px 0 0', color: 'var(--text-secondary)', lineHeight: 1.6 }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: 'var(--text-muted)',
}
const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  fontSize: 15,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}
const submitBtn: React.CSSProperties = {
  marginTop: 8,
  padding: '14px 24px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  border: 0,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'var(--interactive-primary-soft)',
  color: 'var(--interactive-primary)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
}
const primaryLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 24px',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  borderRadius: 'var(--radius-pill)',
  textDecoration: 'none',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textAlign: 'center',
}
const ghostBtn: React.CSSProperties = {
  padding: '14px 24px',
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid rgba(42,33,24,0.3)',
  borderRadius: 'var(--radius-pill)',
  cursor: 'pointer',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}
