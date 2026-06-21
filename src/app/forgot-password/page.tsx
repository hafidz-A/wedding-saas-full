'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getDict } from '@/lib/i18n'
import { useClientLang } from '@/lib/i18n/useClientLang'
import { AuthChrome } from '@/components/site/AuthChrome'

/**
 * /forgot-password — sends a Supabase Auth password reset email.
 *
 * The email links back to /reset-password with the recovery tokens in
 * the URL hash. No third-party email service (Resend / SendGrid) is
 * required — Supabase's default SMTP handles it.
 *
 * Free tier: ~4 emails/hour. For higher volume, configure custom SMTP
 * at: Supabase Dashboard → Authentication → Email Templates → SMTP.
 */
function ForgotPasswordInner() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const template = searchParams.get('template') || 'lovebirds'
  const lang = useClientLang()
  const t = getDict(lang).auth.forgot

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setError('')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Token-based recovery flow: Supabase emails the 6-digit token (the
    // `{{ .Token }}` variable in the Reset Password template). User enters
    // it manually on /reset-password — no link-click required. We still
    // pass redirectTo for users who DO click any URL in the email; it
    // falls back to the same page.
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password?email=${encodeURIComponent(email.trim())}`,
    })

    if (resetErr) {
      setError(resetErr.message || t.errSend)
      setSubmitting(false)
      return
    }

    setSent(true)
    setSubmitting(false)
  }

  return (
    <>
    <AuthChrome lang={lang} />
    <main style={page}>
      <div style={card}>
        <header style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={kicker}>{t.kicker}</p>
          <h1 style={title}>{t.title}</h1>
        </header>

        {sent ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={hint}>
              {t.sentHintPrefix} <strong>{email}</strong> {t.sentHintSuffix}
            </p>
            <Link
              href={`/reset-password?email=${encodeURIComponent(email)}${slug ? `&slug=${encodeURIComponent(slug)}&template=${encodeURIComponent(template)}` : ''}`}
              style={{ ...primaryBtn, textAlign: 'center', textDecoration: 'none', display: 'block' }}
            >
              {t.continueToken}
            </Link>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {slug && (
                <Link href={`/${template}/${slug}/dashboard`} style={ghostBtn}>
                  {t.backLogin}
                </Link>
              )}
              <button type="button" onClick={() => { setSent(false); setEmail('') }} style={ghostBtn}>
                {t.resendOther}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 18 }}>
            <p style={hint}>{t.hintForm}</p>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={label}>{t.email}</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={input}
              />
            </label>

            {error && <p style={errorStyle}>{error}</p>}

            <button type="submit" disabled={submitting} style={primaryBtn}>
              {submitting ? t.submitting : t.submit}
            </button>

            <p style={{ textAlign: 'center', margin: 0 }}>
              {slug ? (
                <Link href={`/${template}/${slug}/dashboard`} style={linkStyle}>{t.backLogin}</Link>
              ) : (
                <Link href="/" style={linkStyle}>{t.backHome}</Link>
              )}
            </p>
          </form>
        )}
      </div>
    </main>
    </>
  )
}

/**
 * Page-level export wraps the inner component in a Suspense boundary —
 * required because ForgotPasswordInner uses `useSearchParams()` which
 * forces the page to bail out of static prerendering. Without Suspense
 * the Vercel build fails at "Generating static pages" for this route.
 */
export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main style={page}>
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'rgba(42,33,24,0.6)', fontSize: 13 }}>Loading…</p>
          </div>
        </main>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const card: React.CSSProperties = {
  maxWidth: 460,
  width: '100%',
  padding: 'clamp(24px, 6vw, 40px)',
  background: 'rgba(255,255,255,0.94)',
  borderRadius: 22,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
}
const kicker: React.CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.32em', fontSize: 11, color: '#E8553E', margin: '0 0 8px' }
const title: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 32, margin: 0 }
const hint: React.CSSProperties = { fontSize: 13, color: 'rgba(42,33,24,0.7)', lineHeight: 1.6, margin: 0 }
const label: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(42,33,24,0.7)' }
const input: React.CSSProperties = { padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 15, outline: 'none', background: '#fff' }
const errorStyle: React.CSSProperties = { color: '#E8553E', fontSize: 13, margin: 0 }
const primaryBtn: React.CSSProperties = { padding: '14px 24px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { padding: '10px 16px', borderRadius: 999, background: 'transparent', color: '#2A2118', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(42,33,24,0.2)', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const linkStyle: React.CSSProperties = { color: '#E8553E', textDecoration: 'none', fontSize: 13 }
