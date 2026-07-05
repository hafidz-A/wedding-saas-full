'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Step = 'loading' | 'idle' | 'verify' | 'done' | 'already'

/**
 * Admin-only TOTP 2FA enrollment. Supabase's dashboard can't enrol a TOTP factor
 * for a user (it must be done in-app, scanning a QR), so this small flow lets the
 * operator turn on 2FA. Once a factor is verified, subsequent logins prompt for a
 * code (AAL1 -> AAL2), which is what `requireAdmin` needs to open /admin.
 */
export default function MfaEnroll() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const [step, setStep] = useState<Step>('loading')
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verified = data?.totp?.some((f) => f.status === 'verified')
        setStep(verified ? 'already' : 'idle')
      })
      .catch(() => setStep('idle'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    setErr(null)
    setBusy(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `admin-${Date.now()}`,
    })
    setBusy(false)
    if (error || !data) {
      setErr(error?.message || 'Gagal memulai. Coba lagi.')
      return
    }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('verify')
  }

  async function confirm() {
    setErr(null)
    setBusy(true)
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factorId! })
    if (cErr || !ch) {
      setBusy(false)
      setErr('Gagal memverifikasi. Coba lagi.')
      return
    }
    const { error } = await supabase.auth.mfa.verify({ factorId: factorId!, challengeId: ch.id, code })
    setBusy(false)
    if (error) {
      setErr('Kode salah, coba lagi.')
      return
    }
    setStep('done')
  }

  if (step === 'loading') return null
  if (step === 'already')
    return <p style={{ fontSize: 14, color: 'var(--color-emerald)', margin: 0 }}>✓ 2FA sudah aktif di akun ini.</p>
  if (step === 'done')
    return (
      <p style={{ fontSize: 14, color: 'var(--color-emerald)', margin: 0 }}>
        ✓ 2FA berhasil diaktifkan. Lain kali login, kamu diminta kode dari aplikasi authenticator.
      </p>
    )

  return (
    <div>
      {step === 'idle' && (
        <button type="button" onClick={start} disabled={busy} style={btn}>
          {busy ? 'Memuat…' : 'Aktifkan 2FA'}
        </button>
      )}
      {step === 'verify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Scan QR ini pakai Google Authenticator / Authy, lalu masukkan 6 digit kodenya.
          </p>
          {qr && <img src={qr} alt="QR untuk 2FA" style={{ width: 180, height: 180 }} />}
          {secret && (
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--text-muted)' }}>
              Kalau QR tak muncul, ketik kode ini manual: {secret}
            </code>
          )}
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={input}
          />
          <button type="button" onClick={confirm} disabled={busy || code.length !== 6} style={btn}>
            {busy ? 'Memverifikasi…' : 'Verifikasi & aktifkan'}
          </button>
        </div>
      )}
      {err && <p style={{ fontSize: 13, color: 'var(--interactive-primary)', marginTop: 6 }}>{err}</p>}
    </div>
  )
}

const btn: React.CSSProperties = {
  height: 40,
  padding: '0 18px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  border: 0,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
}
const input: React.CSSProperties = {
  height: 44,
  padding: '0 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  fontSize: 16,
  letterSpacing: '0.3em',
  textAlign: 'center',
}
