'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getDict, type Lang } from '@/lib/i18n'
import { resolveNavChrome } from './navChrome'
import styles from './NavControls.module.css'

/**
 * Icon+label (desktop) / icon-only (mobile) Back + Beranda controls that sit
 * next to the Fin•Cards wordmark. What shows is decided per-route by
 * resolveNavChrome(pathname) — nothing on the landing page. Back pops browser
 * history (router.back) with a safe fallback to "/" when there is no history to
 * pop, so it can never strand the user off-site.
 */
export function NavControls({ lang }: { lang: Lang }) {
  const pathname = usePathname()
  const router = useRouter()
  const c = getDict(lang).common
  const { back, home } = resolveNavChrome(pathname ?? '/')

  if (!back && !home) return null

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <div className={styles.group}>
      {back && (
        <button type="button" className={styles.ctl} onClick={goBack} aria-label={c.nav.back}>
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          <span className={styles.label}>{c.nav.back}</span>
        </button>
      )}
      {home && (
        <Link href="/" className={styles.ctl} aria-label={c.nav.home}>
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9" />
          </svg>
          <span className={styles.label}>{c.nav.home}</span>
        </Link>
      )}
    </div>
  )
}
