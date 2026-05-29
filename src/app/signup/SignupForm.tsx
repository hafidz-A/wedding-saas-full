'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Dict } from '@/lib/i18n'

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
export default function SignupForm({ dict }: { dict: Dict['auth']['signup'] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError(dict.errFill)
      return
    }
    if (password.length < 8) {
      setError(dict.errMin8)
      return
    }
    if (password !== repeat) {
      setError(dict.errMismatch)
      return
    }

    setSubmitting(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
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

    // Only a genuinely new signup gets a user with a non-empty identities[].
    // Anything else — no user, or an obfuscated user with empty identities[]
    // (Supabase's anti email-enumeration response for an already-registered
    // email) — means the email is taken. Send them to login and NEVER continue
    // to /verify-signup, where no token would ever arrive.
    const isNewSignup = !!data.user && (data.user.identities?.length ?? 0) > 0
    if (!isNewSignup) {
      setError(dict.errAlready)
      setSubmitting(false)
      return
    }

    router.push(`/verify-signup?email=${encodeURIComponent(email.trim())}`)
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

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={submitting} style={submitBtn}>
          {submitting ? dict.submitting : dict.submit}
        </button>

        <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 14 }}>
          {dict.haveAccount}{' '}
          <Link href="/login" style={{ color: '#E8553E', textDecoration: 'underline' }}>
            {dict.loginLink}
          </Link>
        </p>
        <p style={{ ...muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
          <Link href="/" style={{ color: 'rgba(42,33,24,0.55)', textDecoration: 'underline' }}>
            {dict.back}
          </Link>
        </p>
      </form>
    </main>
  )
}

const panel: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  padding: 36,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: '#E8553E',
  margin: '0 0 8px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 36,
  margin: 0,
  color: '#2A2118',
  lineHeight: 1.1,
}
const muted: React.CSSProperties = { margin: '8px 0 0', color: '#5C4A3A', lineHeight: 1.6 }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: 'rgba(42,33,24,0.6)',
}
const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(42,33,24,0.18)',
  fontSize: 15,
  fontFamily: 'inherit',
}
const submitBtn: React.CSSProperties = {
  marginTop: 8,
  padding: '14px 24px',
  borderRadius: 999,
  background: '#2A2118',
  color: '#F5EFE3',
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
  background: 'rgba(232,85,62,0.1)',
  color: '#E8553E',
  borderRadius: 10,
  fontSize: 13,
}
