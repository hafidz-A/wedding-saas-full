'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugAvailable } from '@/app/onboarding/actions'
import type { Dict, Lang } from '@/lib/i18n'
import { LangToggle } from '@/components/site/LangToggle'
import QuotaStepper from '@/components/dashboard/QuotaStepper'
import { QUOTA_CAP, formatIDR, quotaAddonAmount, clampQuotaExtra } from '@/lib/payments/quota'

/**
 * InvitationDetailsForm — the couple's basic-data fields (language, template
 * pick, bride/groom/date/venue, invitation URL + availability hint, guest
 * quota). Extracted from `OnboardingForm` (Task 5, manual-payment-fallback
 * plan) so the SAME field UI/state can be reused inside the manual-mode
 * "order" popup (`ManualOrderModal`, Task 6), which has no `useSearchParams`
 * context. This component is deliberately context-agnostic: every input it
 * needs (plan, prices, template list) arrives via props, never route state.
 *
 * The caller owns submission: it renders its own `footer` (error + submit
 * button) and reads the couple's current values through `onValidChange`,
 * firing on every relevant change and once more with `null` on unmount so a
 * stateful parent (e.g. a modal that gets closed/remounted) never holds a
 * stale snapshot.
 */

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
}

export interface TemplateOption {
  id: string
  label: string
  accent?: string
  tags?: string[]
}

export interface InvitationValues {
  template: string
  plan: string
  slug: string
  bride: string
  groom: string
  date: string
  venue: string
  guestTotal: number
  guestExtra: number
  valid: boolean
}

export interface InvitationDetailsFormProps {
  dict: Dict['onboarding']
  lang: Lang
  plan: string
  planBase: number
  planPrice: number
  templateOptions?: TemplateOption[]
  template: string
  onTemplateChange?: (id: string) => void
  lockTemplate?: boolean
  extra?: number
  onValidChange?: (v: InvitationValues | null) => void
  footer: React.ReactNode
}

export default function InvitationDetailsForm({
  dict,
  lang,
  plan,
  planBase,
  planPrice,
  templateOptions,
  template,
  onTemplateChange,
  lockTemplate,
  extra = 0,
  onValidChange,
  footer,
}: InvitationDetailsFormProps) {
  // Effective quota (base..cap) — same initial math as the original
  // OnboardingForm: base + the clamped starting `extra` (e.g. `?extra=` on
  // the onboarding URL). `planBase` is a fixed prop for this component's
  // lifetime, so a plain useState initializer mirrors prior behaviour.
  const [guestTotal, setGuestTotal] = useState(planBase + clampQuotaExtra(planBase, extra))
  const guestExtra = Math.max(0, guestTotal - planBase)

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [slugStatus, setSlugStatus] = useState<{ checking?: boolean; available?: boolean; reason?: string }>({})

  // Auto-suggest slug from bride+groom first names until user edits it themselves.
  useEffect(() => {
    if (slugTouched) return
    const a = firstWord(bride)
    const b = firstWord(groom)
    if (a && b) setSlug(`${a}-${b}`)
    else if (a) setSlug(a)
    else if (b) setSlug(b)
  }, [bride, groom, slugTouched])

  // Debounced slug availability check. `checkSlugAvailable` needs no auth (it
  // only validates format + queries via the admin client), so this works the
  // same whether the form is mounted on the signed-in /onboarding page or the
  // anonymous manual-mode order popup.
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

  const slugOk = Boolean(slug && slugStatus.available && !slugStatus.checking)
  const valid = Boolean(slugOk && bride.trim() && groom.trim() && date && venue.trim())

  // Surface current values to the parent. Kept in a ref so the effect below
  // doesn't need `onValidChange` itself in its dependency list (callers often
  // pass an inline setState — stable in practice, but this avoids re-firing
  // on a parent re-render that merely creates a new function identity).
  const onValidChangeRef = useRef(onValidChange)
  useEffect(() => {
    onValidChangeRef.current = onValidChange
  })

  useEffect(() => {
    onValidChangeRef.current?.({
      template,
      plan,
      slug,
      bride,
      groom,
      date,
      venue,
      guestTotal,
      guestExtra,
      valid,
    })
  }, [template, plan, slug, bride, groom, date, venue, guestTotal, guestExtra, valid])

  // Clear the parent's snapshot when this form unmounts (e.g. the modal that
  // hosts it closes) so a stale "valid" set of values can't linger.
  useEffect(() => {
    return () => {
      onValidChangeRef.current?.(null)
    }
  }, [])

  return (
    <div style={wrap}>
      {!lockTemplate && templateOptions && templateOptions.length > 0 && (
        <div style={field}>
          <span style={lbl}>{dict.form.pickTemplate}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {templateOptions.map((t) => {
              const active = t.id === template
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTemplateChange?.(t.id)}
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
                  {t.tags && t.tags.length > 0 && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      {t.tags.join(' · ')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

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

      <div style={field}>
        <span style={lbl}>{dict.quota.label}</span>
        <QuotaStepper
          value={guestTotal}
          min={planBase}
          max={QUOTA_CAP}
          onChange={setGuestTotal}
          typableHint={dict.quota.typableHint}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {dict.quota.includedPrefix} {planBase}
          {guestExtra > 0 &&
            ` · ${dict.quota.addonHintPrefix} ${guestExtra} · +${formatIDR(quotaAddonAmount(guestExtra))}`}
        </span>
        {planPrice ? (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Total: {formatIDR(planPrice + quotaAddonAmount(guestExtra))}
          </span>
        ) : null}
      </div>

      {footer}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 }
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
