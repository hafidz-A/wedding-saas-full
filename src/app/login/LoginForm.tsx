'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Dict } from '@/lib/i18n'
import { safeNext } from '@/lib/auth/safeNext'
import authStyles from '@/components/site/AuthChrome.module.css'

/**
 * /login — slug-agnostic password login.
 *
 * After signInWithPassword succeeds, honor `?next=<internal-path>` when
 * present (e.g. coming from "Pakai template ini" → /onboarding?template=…).
 * Plain logins (no intent) land on the homepage.
 */
export default function LoginForm({ dict }: { dict: Dict['auth']['login'] }) {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // MFA (AAL2) challenge step — only used when the signed-in session still
  // needs a second factor (e.g. an allowlisted admin with TOTP enrolled).
  // Users with no enrolled factor never touch this branch or state.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError(dict.errFill)
      return
    }

    setSubmitting(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError(dict.errInvalid)
      } else if (msg.includes('not confirmed')) {
        setError(dict.errNotConfirmed)
      } else {
        setError(signInError.message)
      }
      setSubmitting(false)
      return
    }

    // Backwards-compatible MFA gate: only branches when the session actually
    // needs a step-up to AAL2 (nextLevel) and isn't there yet (currentLevel).
    // A user with no enrolled TOTP factor falls straight through unaffected.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        setMfaFactorId(totp.id) // switches the UI to the 6-digit code step
        setSubmitting(false)
        return // stop here — do not redirect yet
      }
    }

    router.push(next || '/')
    router.refresh()
  }

  async function verifyMfa() {
    setMfaError(null)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId! })
    if (chErr || !ch) {
      setMfaError('Gagal memulai verifikasi. Coba lagi.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId!,
      challengeId: ch.id,
      code: mfaCode,
    })
    if (verifyError) {
      setMfaError('Kode salah, coba lagi.')
      return
    }
    window.location.href = next || '/'
  }

  return (
    <main style={panel}>
      {mfaFactorId ? (
        <div style={card}>
          <header style={{ marginBottom: 4 }}>
            <p style={kicker}>{dict.kicker}</p>
            <h1 style={h1}>Verifikasi 2 Langkah</h1>
            <p style={muted}>Masukkan 6 digit kode dari aplikasi authenticator kamu.</p>
          </header>

          <label style={field}>
            <span style={lbl}>Kode Verifikasi</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              placeholder="123456"
              style={input}
            />
          </label>

          {mfaError && <p style={errorStyle}>{mfaError}</p>}

          <button type="button" onClick={verifyMfa} className={authStyles.authPrimaryBtn} style={{ marginTop: 8 }}>
            Verifikasi
          </button>
        </div>
      ) : (
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
              placeholder={dict.passwordPlaceholder}
              style={input}
            />
          </label>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={submitting} className={authStyles.authPrimaryBtn} style={{ marginTop: 8 }}>
            {submitting ? dict.submitting : dict.submit}
          </button>

          <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 14 }}>
            {dict.forgotPrompt}{' '}
            <Link href="/forgot-password" style={{ color: 'var(--interactive-primary)', textDecoration: 'underline' }}>
              {dict.forgotLink}
            </Link>
          </p>
          <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            {dict.noAccount}{' '}
            <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} style={{ color: 'var(--interactive-primary)', textDecoration: 'underline' }}>
              {dict.signupLink}
            </Link>
          </p>
          <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
              {dict.back}
            </Link>
          </p>
        </form>
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
const submitBtn: React.CSSProperties = {
  marginTop: 8,
  height: 44,
  padding: '1px 24px 0 24px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  border: 0,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'var(--interactive-primary-soft)',
  color: 'var(--interactive-primary)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
}
