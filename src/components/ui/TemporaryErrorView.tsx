'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './Button'

/**
 * Full-page "temporary trouble, try again" notice — for a database/network
 * outage, which must never read as "not found" or as an empty list. Shows no
 * error details (they can carry internals). Both languages at once: an error
 * boundary renders without the i18n provider.
 *
 * `onRetry` is an error boundary's reset; without it the page is reloaded.
 */
export function TemporaryErrorView({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const retry = () => {
    if (!onRetry) {
      window.location.reload()
      return
    }
    startTransition(() => {
      router.refresh()
      onRetry()
    })
  }
  return (
    <main style={shell} role="alert">
      <div style={card}>
        <h1 style={title}>Sedang ada gangguan</h1>
        <p style={body}>
          Halaman ini gagal dimuat karena gangguan sementara di server — data Anda aman.
          Silakan coba lagi sebentar lagi.
        </p>
        <p style={bodyEn}>Something went wrong on our side. Your data is safe — please try again in a moment.</p>
        <Button onClick={retry} disabled={pending}>{pending ? 'Memuat…' : 'Coba lagi'}</Button>
      </div>
    </main>
  )
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  maxWidth: 480,
  padding: 40,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
  textAlign: 'center',
}
const title: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontStyle: 'italic',
  fontSize: 30,
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.2,
}
const body: React.CSSProperties = { color: 'var(--text-secondary)', lineHeight: 1.65, margin: '14px 0 6px', fontSize: 14 }
const bodyEn: React.CSSProperties = { color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px', fontSize: 13 }
