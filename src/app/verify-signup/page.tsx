'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { getDict } from '@/lib/i18n'
import { useClientLang } from '@/lib/i18n/useClientLang'
import { AuthChrome } from '@/components/site/AuthChrome'
import { safeNext } from '@/lib/auth/safeNext'

/**
 * /verify-signup — 6-digit token entry after signUp.
 *
 * User flow:
 *   1. /signup calls supabase.auth.signUp({ email, password })
 *      → Supabase emails the {{ .Token }} 6-digit code via Resend SMTP
 *   2. Browser auto-routes here with ?email=… prefilled
 *   3. User enters the 6-digit code from the email
 *   4. Page calls supabase.auth.verifyOtp({ email, token, type: 'signup' })
 *      → that exchanges the code for an active session
 *   5. Once signed in, redirect to /onboarding
 *
 * Supabase Dashboard config required:
 *   Authentication → Email Templates → "Confirm signup" → body must include
 *   {{ .Token }} (the 6-digit code). Default uses {{ .ConfirmationURL }}
 *   which is the link version — change to:
 *
 *     <p>Kode verifikasi Anda:</p>
 *     <h2>{{ .Token }}</h2>
 */
function VerifySignupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetEmail = searchParams.get('email') || ''
  const next = safeNext(searchParams.get('next'))
  const lang = useClientLang()
  const t = getDict(lang).auth.verify

  const [email, setEmail] = useState(presetEmail)
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t.errEmail)
      return
    }
    if (!token.trim()) {
      setError(t.errCode)
      return
    }

    setSubmitting(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'signup',
    })

    if (verifyErr) {
      setError(verifyErr.message || t.errWrong)
      setSubmitting(false)
      return
    }

    router.push(next || '/')
    router.refresh()
  }

  async function resendCode() {
    if (!email.trim() || resending) return
    setResending(true)
    setError(null)
    setResent(false)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })
    setResending(false)
    if (resendErr) {
      setError(resendErr.message || t.errResend)
      return
    }
    setResent(true)
  }

  return (
    <>
    <AuthChrome lang={lang} />
    <main style={page}>
      <form onSubmit={onSubmit} style={card}>
        <header style={{ textAlign: 'center', marginBottom: 4 }}>
          <p style={kicker}>{t.kicker}</p>
          <h1 style={title}>{t.title}</h1>
          <p style={hint}>{t.hint}</p>
        </header>

        <label style={field}>
          <span style={label}>{t.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t.emailPlaceholder}
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>{t.code}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            required
            placeholder="123456"
            autoFocus
            style={{ ...input, fontSize: 22, letterSpacing: '0.4em', textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}
          />
        </label>

        {error && <p style={errorStyle}>{error}</p>}
        {resent && !error && (
          <p style={{ ...hint, color: 'var(--color-emerald)', margin: 0 }}>
            {t.resent}
          </p>
        )}

        <button type="submit" disabled={submitting} style={primaryBtn}>
          {submitting ? t.submitting : t.submit}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
          <button
            type="button"
            onClick={resendCode}
            disabled={resending || !email.trim()}
            style={linkBtn}
          >
            {resending ? t.resending : t.resend}
          </button>
          <Link href="/signup" style={{ ...linkBtn, textDecoration: 'none' }}>
            {t.changeEmail}
          </Link>
        </div>
      </form>
    </main>
    </>
  )
}

export default function VerifySignupPage() {
  return (
    <Suspense fallback={<main style={page}><div style={card}>Memuat…</div></main>}>
      <VerifySignupInner />
    </Suspense>
  )
}

const page: React.CSSProperties = {
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
const title: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontStyle: 'italic',
  fontSize: 30,
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.15,
}
const hint: React.CSSProperties = { color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14, margin: '8px 0 0' }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const label: React.CSSProperties = {
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
const primaryBtn: React.CSSProperties = {
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
const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 0,
  color: 'var(--interactive-primary)',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: 0,
  fontSize: 13,
  fontFamily: 'inherit',
}
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'var(--interactive-primary-soft)',
  color: 'var(--interactive-primary)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
}
