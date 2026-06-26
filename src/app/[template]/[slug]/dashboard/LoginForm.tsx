'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'motion/react'
import { createBrowserClient } from '@supabase/ssr'
import type { Dict, Lang } from '@/lib/i18n'
import { AuthChrome } from '@/components/site/AuthChrome'
import styles from './dashboard.module.css'

export default function LoginForm({
  slug,
  template,
  dict,
  lang,
}: {
  slug: string
  template: string
  dict: Dict['dashboard']['login']
  lang: Lang
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialError = searchParams.get('error') || ''
  const ERRORS: Record<string, string> = {
    wrongpass: dict.errWrongpass,
    notfound: dict.errNotfound,
    missing: dict.errMissing,
    notowner: dict.errNotowner,
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(initialError && ERRORS[initialError] ? ERRORS[initialError] : '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError(ERRORS.missing)
      return
    }
    setSubmitting(true)
    setError('')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(ERRORS.wrongpass)
      setSubmitting(false)
      return
    }

    // Reload so the server component re-runs and detects the new session.
    router.refresh()
  }

  return (
    <>
    <AuthChrome lang={lang} />
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
        padding: 24,
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <motion.form
        onSubmit={onSubmit}
        className={styles.loginForm}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          boxShadow: '0 24px 64px rgba(42, 33, 24, 0.08), inset 0 0 0 1px rgba(255,255,255,0.7)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 'var(--radius-md)',
          padding: 40,
          display: 'grid',
          gap: 18,
          maxWidth: 420,
          width: '100%',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: 8 }}>
          <p
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.32em',
              fontSize: 11,
              color: 'var(--interactive-primary)',
              margin: '0 0 8px',
            }}
          >
            {dict.eyebrow}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display, serif)',
              fontStyle: 'italic',
              fontSize: 32,
              margin: 0,
              color: 'var(--text-primary)',
            }}
          >
            {dict.titlePrefix} <span style={{ fontStyle: 'normal', fontWeight: 600 }}>{slug}</span>
          </h1>
        </header>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{dict.email}</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@example.com"
            style={input}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{dict.password}</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={input}
          />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={submitting} style={submitBtn}>
          {submitting ? dict.loading : dict.submit}
        </button>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <Link
            href={`/forgot-password?slug=${encodeURIComponent(slug)}&template=${encodeURIComponent(template)}`}
            style={{ color: 'var(--interactive-primary)', fontSize: 13, textDecoration: 'none' }}
          >
            {dict.forgot}
          </Link>
        </p>
      </motion.form>
    </main>
    </>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: 'var(--text-muted)',
}

const input: React.CSSProperties = {
  padding: '13px 16px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  fontSize: 15,
  outline: 'none',
}

const submitBtn: React.CSSProperties = {
  padding: '14px 24px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  marginTop: 4,
}

const errorStyle: React.CSSProperties = {
  color: 'var(--interactive-primary)',
  fontSize: 13,
  margin: 0,
}
