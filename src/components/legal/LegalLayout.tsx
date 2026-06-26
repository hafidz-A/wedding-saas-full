import Link from 'next/link'
import type { ReactNode } from 'react'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import styles from './legal.module.css'

/**
 * Shared presentational shell for the legal pages (/terms, /privacy, /refund).
 * Matches the warm-cream aesthetic of the profile + expired-invitation views.
 * Bilingual chrome: the "last updated" label and footer links follow the
 * site language (fin_lang cookie), same as the SiteNav.
 */
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: ReactNode
}) {
  const lang = getLang()
  const t = getDict(lang)
  const en = lang === 'en'

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <article style={wrap}>
          <h1 style={h1}>{title}</h1>
          {updated && (
            <p style={meta}>{en ? 'Last updated' : 'Terakhir diperbarui'}: {updated}</p>
          )}
          <div style={body} className={styles.prose}>{children}</div>
          <p style={footerLinks}>
            <Link href="/terms" style={link}>{en ? 'Terms & Conditions' : 'Syarat & Ketentuan'}</Link>
            {' · '}
            <Link href="/privacy" style={link}>{en ? 'Privacy Policy' : 'Kebijakan Privasi'}</Link>
            {' · '}
            <Link href="/refund" style={link}>{en ? 'Refund Policy' : 'Pengembalian Dana'}</Link>
          </p>
        </article>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 80px',
  fontFamily: 'var(--font-body, system-ui)',
  color: 'var(--text-primary)',
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
  borderRadius: 'var(--radius-md)',
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
const link: React.CSSProperties = { color: 'var(--interactive-primary)', textDecoration: 'none', fontWeight: 600 }
