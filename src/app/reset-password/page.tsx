'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { getDict } from '@/lib/i18n'
import { useClientLang } from '@/lib/i18n/useClientLang'
import { AuthChrome } from '@/components/site/AuthChrome'
import { isPasswordValid } from '@/lib/auth/passwordPolicy'
import { pwnedPasswordCount } from '@/lib/auth/pwnedPassword'
import { usePwnedPassword } from '@/lib/auth/usePwnedPassword'
import PasswordChecklist from '@/components/auth/PasswordChecklist'
import { Button } from '@/components/ui/Button'

/**
 * /reset-password — TOKEN-based password reset.
 *
 * User flow:
 *   1. Receives a 6-digit token via email (sent from /forgot-password)
 *   2. Opens /reset-password (manually or from email link)
 *   3. Enters email + token + new password
 *   4. Page calls supabase.auth.verifyOtp({ email, token, type: 'recovery' })
 *      → that exchanges the token for a session
 *   5. Page calls supabase.auth.updateUser({ password }) to set the new password
 *   6. Looks up the user's invitation slug → redirects to dashboard
 *
 * Supabase Dashboard config required:
 *   Authentication → Email Templates → Reset Password →
 *   Make sure the body includes {{ .Token }} (the 6-digit code).
 *   The default template uses {{ .ConfirmationURL }}; you can keep that
 *   too, or replace it. Example body:
 *
 *     <p>Kode reset password Anda:</p>
 *     <h2>{{ .Token }}</h2>
 *     <p>Masukkan kode ini di halaman reset password.</p>
 */
function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetEmail = searchParams.get('email') || ''
  const dict = getDict(useClientLang())
  const t = dict.auth.reset
  const rules = dict.auth.passwordRules

  const [email, setEmail] = useState(presetEmail)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [hasInvitation, setHasInvitation] = useState(false)
  // 2FA (MFA) accounts (e.g. admin) need an AAL2 session to change the password:
  // after the email OTP we reveal an authenticator-code field and elevate.
  const [mfaCode, setMfaCode] = useState('')
  const [needsMfa, setNeedsMfa] = useState(false)
  const [recovered, setRecovered] = useState(false) // email OTP already consumed
  const { pwned, checking } = usePwnedPassword(password)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t.errEmail)
      return
    }
    if (!recovered && !token.trim()) {
      setError(t.errToken)
      return
    }
    if (!isPasswordValid(password)) {
      setError(rules.error)
      return
    }
    if (password !== confirm) {
      setError(t.errMismatch)
      return
    }

    setSubmitting(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // 1. Consume the 6-digit recovery OTP ONCE → an (AAL1) recovery session.
    //    The OTP is single-use, so on a second submit (the 2FA step below) we
    //    reuse the session we already have instead of re-verifying the code.
    if (!recovered) {
      // Free, self-hosted leaked-password check (HIBP k-anonymity). Fails open.
      if ((await pwnedPasswordCount(password)) > 0) {
        setError(rules.breached)
        setSubmitting(false)
        return
      }
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'recovery',
      })
      if (verifyErr) {
        setError(verifyErr.message || t.errVerify)
        setSubmitting(false)
        return
      }
      setRecovered(true)
    }

    // 2. Accounts with 2FA (MFA) enrolled — e.g. the admin — need an AAL2 session
    //    to change email/password. Elevate with the authenticator app's code.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      if (!mfaCode.trim()) {
        setNeedsMfa(true)
        setError(t.errMfaNeeded)
        setSubmitting(false)
        return
      }
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (!totp) {
        setError(t.errMfaNoFactor)
        setSubmitting(false)
        return
      }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (chErr || !ch) {
        setError(chErr?.message || t.errMfaFailed)
        setSubmitting(false)
        return
      }
      const { error: verErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode.trim() })
      if (verErr) {
        setError(t.errMfaCode)
        setSubmitting(false)
        return
      }
    }

    // 3. Set the new password (AAL2 session if MFA, AAL1 otherwise).
    const { error: updErr } = await supabase.auth.updateUser({ password })
    if (updErr) {
      setError(updErr.message || t.errUpdate)
      setSubmitting(false)
      return
    }

    // 3. Look up the user's invitation slug so we can deep-link them
    const { data: { user } } = await supabase.auth.getUser()
    let slug = ''
    let template = 'lovebirds'
    if (user) {
      const { data: invitation } = await supabase
        .from('invitations')
        .select('slug, template_id')
        .eq('owner_user_id', user.id)
        .maybeSingle()
      slug = (invitation as any)?.slug || ''
      template = (invitation as any)?.template_id || 'lovebirds'
    }

    setHasInvitation(Boolean(slug))
    setDone(true)
    setSubmitting(false)

    // Always navigate away so the success screen never dead-ends. Owners go to
    // their dashboard; a user without an invitation lands on the homepage —
    // they're already signed in, so the navbar there gives profile + create
    // access. (Previously a slug-less account got stuck here with no redirect.)
    const dest = slug ? `/${template}/${slug}/dashboard` : '/'
    setTimeout(() => router.replace(dest), 1200)
  }

  if (done) {
    return (
      <div style={card}>
        <header style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={kicker}>{t.doneKicker}</p>
          <h1 style={title}>{t.doneTitle}</h1>
        </header>
        <p style={hint}>{hasInvitation ? t.doneHint : t.doneHintHome}</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <header style={{ textAlign: 'center', marginBottom: 8 }}>
        <p style={kicker}>{t.kicker}</p>
        <h1 style={title}>{t.title}</h1>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <p style={hint}>{t.hint}</p>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>{t.email}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            style={input}
            autoComplete="email"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>{t.token}</span>
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={{ ...input, letterSpacing: '0.3em', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            autoFocus={!!presetEmail}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>{t.password}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            autoComplete="new-password"
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

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>{t.confirm}</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={input}
            autoComplete="new-password"
          />
        </label>

        {needsMfa && (
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={label}>{t.mfaLabel}</span>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ ...input, letterSpacing: '0.3em', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              autoFocus
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.mfaHint}</span>
          </label>
        )}

        {error && <p style={errorStyle}>{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </Button>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <Link href="/forgot-password" style={linkStyle}>{t.resend}</Link>
        </p>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  const lang = useClientLang()
  return (
    <>
      <AuthChrome lang={lang} />
      <main style={page}>
        <Suspense fallback={<div style={card}><p style={hint}>Loading…</p></div>}>
          <ResetPasswordInner />
        </Suspense>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
  color: 'var(--text-primary)',
}
const card: React.CSSProperties = {
  maxWidth: 460,
  width: '100%',
  padding: 'clamp(24px, 6vw, 40px)',
  background: 'rgba(255,255,255,0.94)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
  display: 'grid',
  gap: 16,
}
const kicker: React.CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.32em', fontSize: 11, color: 'var(--interactive-primary)', margin: '0 0 8px' }
const title: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }
const label: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--text-muted)' }
const input: React.CSSProperties = { height: 44, padding: '12px 16px 10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 15, outline: 'none', background: 'var(--surface-raised)', boxSizing: 'border-box' }
const errorStyle: React.CSSProperties = { color: 'var(--interactive-primary)', fontSize: 13, margin: 0 }
const linkStyle: React.CSSProperties = { color: 'var(--interactive-primary)', textDecoration: 'none', fontSize: 13 }
