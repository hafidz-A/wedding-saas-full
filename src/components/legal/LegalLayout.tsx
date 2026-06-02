import Link from 'next/link'
import type { ReactNode } from 'react'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import styles from './legal.module.css'

/**
 * Shared presentational shell for the legal pages (/terms, /privacy, /refund).
 * Matches the warm-cream aesthetic of the profile + expired-invitation views.
 */
export default function LegalLayout({
  title,
  updated,
  draftNote,
  children,
}: {
  title: string
  updated?: string
  draftNote?: string
  children: ReactNode
}) {
  const lang = getLang()
  const t = getDict(lang)

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <article style={wrap}>
          <h1 style={h1}>{title}</h1>
          {updated && <p style={meta}>Terakhir diperbarui: {updated}</p>}
          {draftNote && <p className={styles.draftNote}>{draftNote}</p>}
          <div style={body} className={styles.prose}>{children}</div>
          <p style={footerLinks}>
            <Link href="/terms" style={link}>Syarat &amp; Ketentuan</Link>
            {' · '}
            <Link href="/privacy" style={link}>Kebijakan Privasi</Link>
            {' · '}
            <Link href="/refund" style={link}>Pengembalian Dana</Link>
          </p>
        </article>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 80px',
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', width: '100%' }
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 'clamp(32px, 6vw, 52px)',
  margin: '0 0 8px',
}
const meta: React.CSSProperties = { fontSize: 13, color: '#7A6A57', margin: '0 0 28px' }
const body: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)',
  borderRadius: 18,
  padding: 'clamp(20px, 4vw, 40px)',
  boxShadow: '0 20px 60px rgba(42,33,24,0.10)',
  lineHeight: 1.7,
  fontSize: 15,
}
const footerLinks: React.CSSProperties = {
  marginTop: 28,
  fontSize: 13,
  color: '#7A6A57',
  textAlign: 'center',
}
const link: React.CSSProperties = { color: '#E8553E', textDecoration: 'none', fontWeight: 600 }
