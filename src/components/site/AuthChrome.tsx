'use client'
import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import { getDict, type Lang } from '@/lib/i18n'
import styles from './AuthChrome.module.css'

/**
 * Slim top bar for standalone auth / utility "card" pages that don't render the
 * marketing <SiteNav> — the per-slug dashboard login, the payment gate, the
 * forgot/reset-password pages, and the dashboard error screens. Gives every such
 * page a visible way home (wordmark + an explicit "Beranda" button, because a
 * lone wordmark doesn't read as clickable) plus the EN/ID language toggle.
 *
 * Labels resolve from the common dictionary for the given lang. Client component
 * because LangToggle is interactive; safe to render from a server page (lang is
 * a serializable prop).
 */
export function AuthChrome({ lang }: { lang: Lang }) {
  const c = getDict(lang).common
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <Logo size="sm" />
        <Link href="/" className={styles.home} aria-label={c.nav.home}>
          <svg className={styles.homeIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.homeLabel}>{c.nav.home}</span>
        </Link>
      </div>
      <LangToggle lang={lang} label={c.langToggle.label} />
    </header>
  )
}
