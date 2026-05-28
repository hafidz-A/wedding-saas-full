'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

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

  const [email, setEmail] = useState(presetEmail)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email kosong')
      return
    }
    if (!token.trim()) {
      setError('Token kosong')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (password !== confirm) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setSubmitting(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // 1. Verify the 6-digit OTP to get a recovery session
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    })

    if (verifyErr) {
      setError(verifyErr.message || 'Token salah atau sudah kadaluarsa')
      setSubmitting(false)
      return
    }

    // 2. Set the new password using the now-active recovery session
    const { error: updErr } = await supabase.auth.updateUser({ password })
    if (updErr) {
      setError(updErr.message || 'Gagal update password')
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

    setDone(true)
    setSubmitting(false)

    if (slug) {
      setTimeout(() => router.replace(`/${template}/${slug}/dashboard`), 1200)
    }
  }

  if (done) {
    return (
      <div style={card}>
        <header style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={kicker}>Berhasil</p>
          <h1 style={title}>Password sudah diubah</h1>
        </header>
        <p style={hint}>Kamu otomatis login. Mengarahkan ke dashboard…</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <header style={{ textAlign: 'center', marginBottom: 8 }}>
        <p style={kicker}>Reset Password</p>
        <h1 style={title}>Masukkan token</h1>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <p style={hint}>
          Cek inbox email — kami mengirim kode 6 digit. Paste di sini bersama
          email & password baru.
        </p>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            style={input}
            autoComplete="email"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>Token (6 digit)</span>
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
          <span style={label}>Password baru (min 6 karakter)</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            autoComplete="new-password"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={label}>Konfirmasi password</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={input}
            autoComplete="new-password"
          />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={submitting} style={primaryBtn}>
          {submitting ? 'Memproses…' : 'Set password baru'}
        </button>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <Link href="/forgot-password" style={linkStyle}>← Belum dapat token? Kirim ulang</Link>
        </p>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main style={page}>
      <Suspense fallback={<div style={card}><p style={hint}>Loading…</p></div>}>
        <ResetPasswordInner />
      </Suspense>
    </main>
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
  display: 'grid',
  gap: 16,
}
const kicker: React.CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.32em', fontSize: 11, color: '#E8553E', margin: '0 0 8px' }
const title: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 32, margin: 0 }
const hint: React.CSSProperties = { fontSize: 13, color: 'rgba(42,33,24,0.7)', lineHeight: 1.6, margin: 0 }
const label: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(42,33,24,0.7)' }
const input: React.CSSProperties = { padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 15, outline: 'none', background: '#fff' }
const errorStyle: React.CSSProperties = { color: '#E8553E', fontSize: 13, margin: 0 }
const primaryBtn: React.CSSProperties = { padding: '14px 24px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const linkStyle: React.CSSProperties = { color: '#E8553E', textDecoration: 'none', fontSize: 13 }
