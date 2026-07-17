'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Dict } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n/config'
import { safeNext } from '@/lib/auth/safeNext'
import LegalModal from '@/components/legal/LegalModal'
import PrivacyContent from '@/components/legal/PrivacyContent'
import RefundContent from '@/components/legal/RefundContent'
import { CONSENT_VERSION } from '@/lib/legal/consent'
import { isPasswordValid } from '@/lib/auth/passwordPolicy'
import { pwnedPasswordCount } from '@/lib/auth/pwnedPassword'
import { usePwnedPassword } from '@/lib/auth/usePwnedPassword'
import PasswordChecklist from '@/components/auth/PasswordChecklist'
import { Button } from '@/components/ui/Button'

/**
 * /signup — email + password + repeat. Supabase Auth signUp() sends an
 * email confirmation. All Auth emails route through the Custom SMTP
 * (Resend) configured in Supabase Dashboard → Auth → SMTP, so the rate
 * limit is the Resend quota (3000/month) rather than Supabase's 2/hour
 * built-in cap.
 *
 * After signUp succeeds, user is bounced to /verify-signup to enter the
 * 6-digit token from the email (mirrors the /forgot-password →
 * /reset-password muscle memory).
 *
 * Supabase Dashboard config required:
 *   1. Project Settings → Auth → SMTP Settings → enable Custom SMTP,
 *      point at smtp.resend.com (see CLAUDE.md / docs for exact values).
 *   2. Authentication → Email Templates → "Confirm signup" → body must
 *      include {{ .Token }} (the 6-digit code). Default template uses
 *      only {{ .ConfirmationURL }} which is the link, not the code.
 */
export default function SignupForm({
  dict,
  rules,
  lang = 'id',
}: {
  dict: Dict['auth']['signup']
  rules: Dict['auth']['passwordRules']
  lang?: Lang
}) {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeRefund, setAgreeRefund] = useState(false)
  const [openDoc, setOpenDoc] = useState<'privacy' | 'refund' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { pwned, checking } = usePwnedPassword(password)

  const consentMissing = !agreePrivacy || !agreeRefund

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError(dict.errFill)
      return
    }
    if (!isPasswordValid(password)) {
      setError(rules.error)
      return
    }
    if (password !== repeat) {
      setError(dict.errMismatch)
      return
    }
    if (consentMissing) {
      setError(dict.errConsent)
      return
    }

    setSubmitting(true)

    // Free, self-hosted leaked-password check (HIBP k-anonymity) — the
    // equivalent of Supabase's Pro-only protection. Fails open on any error.
    if ((await pwnedPasswordCount(password)) > 0) {
      setError(rules.breached)
      setSubmitting(false)
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Record the legal consent alongside the account. Lands in
      // auth.users.raw_user_meta_data — no extra table/migration needed, and
      // it still persists under Supabase's email-enumeration protection.
      options: {
        data: {
          consent_privacy: true,
          consent_refund: true,
          consent_version: CONSENT_VERSION,
          consent_at: new Date().toISOString(),
        },
      },
    })

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered')) {
        setError(dict.errAlready)
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError(dict.errRate)
      } else {
        setError(signUpError.message)
      }
      setSubmitting(false)
      return
    }

    // Supabase "Email enumeration protection" (ON by default) makes signUp()
    // return { user: null, session: null } even for a brand-new signup, so
    // data.user.identities can't be used to tell "new" from "already used" —
    // relying on it dead-ended every signup at "email sudah dipakai" and never
    // routed here. On any non-error response a 6-digit token has been emailed,
    // so proceed to the OTP screen. (If email confirmation is disabled, signUp
    // returns a live session instead — skip straight to the destination.)
    if (data.session) {
      router.push(next || '/')
      router.refresh()
      return
    }

    const verifyUrl = `/verify-signup?email=${encodeURIComponent(email.trim())}${next ? `&next=${encodeURIComponent(next)}` : ''}`
    router.push(verifyUrl)
  }

  return (
    <main style={panel}>
      <form onSubmit={onSubmit} style={card}>
        <header style={{ marginBottom: 4 }}>
          <p style={kicker}>{dict.kicker}</p>
          <h1 style={h1}>{dict.title}</h1>
          <p style={muted}>{dict.subtitle}</p>
        </header>

        <label style={field}>
          <span style={lbl}>{dict.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder={dict.emailPlaceholder}
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>{dict.password}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder={dict.passwordPlaceholder}
            style={input}
          />
          <PasswordChecklist password={password} labels={rules} />
          {checking && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {rules.breachedChecking}
            </p>
          )}
          {pwned && !checking && (
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--interactive-primary)', fontWeight: 600 }}>
              {rules.breached}
            </p>
          )}
        </label>

        <label style={field}>
          <span style={lbl}>{dict.repeat}</span>
          <input
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
            placeholder={dict.repeatPlaceholder}
            style={input}
          />
        </label>

        <div style={consentGroup}>
          <div style={consentRow}>
            <input
              id="agree-privacy"
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              style={checkbox}
            />
            <span style={consentText}>
              <label htmlFor="agree-privacy" style={consentLabel}>{dict.consentPrefix}</label>
              <button type="button" onClick={() => setOpenDoc('privacy')} style={consentLink}>
                {dict.consentPrivacy}
              </button>
            </span>
          </div>
          <div style={consentRow}>
            <input
              id="agree-refund"
              type="checkbox"
              checked={agreeRefund}
              onChange={(e) => setAgreeRefund(e.target.checked)}
              style={checkbox}
            />
            <span style={consentText}>
              <label htmlFor="agree-refund" style={consentLabel}>{dict.consentPrefix}</label>
              <button type="button" onClick={() => setOpenDoc('refund')} style={consentLink}>
                {dict.consentRefund}
              </button>
            </span>
          </div>
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <Button
          type="submit"
          disabled={submitting || consentMissing}
          style={{ marginTop: 8 }}
        >
          {submitting ? dict.submitting : dict.submit}
        </Button>

        <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 14 }}>
          {dict.haveAccount}{' '}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ color: 'var(--interactive-primary)', textDecoration: 'underline' }}>
            {dict.loginLink}
          </Link>
        </p>
        <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
            {dict.back}
          </Link>
        </p>
      </form>

      {openDoc === 'privacy' && (
        <LegalModal title={dict.consentPrivacy} closeLabel={dict.modalClose} onClose={() => setOpenDoc(null)}>
          <PrivacyContent lang={lang} />
        </LegalModal>
      )}
      {openDoc === 'refund' && (
        <LegalModal title={dict.consentRefund} closeLabel={dict.modalClose} onClose={() => setOpenDoc(null)}>
          <RefundContent lang={lang} />
        </LegalModal>
      )}
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
  maxWidth: 440,
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
  fontSize: 36,
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
  height: 44,
  padding: '12px 16px 10px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  fontSize: 15,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
const consentGroup: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 4,
}
const consentRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
}
const checkbox: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 2,
  flexShrink: 0,
  accentColor: 'var(--interactive-primary)',
  cursor: 'pointer',
}
const consentText: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.5,
  color: 'var(--text-secondary)',
}
const consentLabel: React.CSSProperties = {
  cursor: 'pointer',
}
const consentLink: React.CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: 'var(--interactive-primary)',
  fontWeight: 600,
  textDecoration: 'underline',
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
